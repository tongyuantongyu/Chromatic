package main

import (
	"ImageServer/native"
	"fmt"
	"github.com/OneOfOne/xxhash"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"io/ioutil"
	"log"
	"os"
	"path"
	"sync"
	"time"
)

var (
	_semaphore chan struct{}
	_avifQueue chan primitive.ObjectID
)

func InitEncoder() {
	if config.Site.Thread > 3 {
		_semaphore = make(chan struct{}, config.Site.Thread - 2)
		for i := uint64(0); i < config.Site.Thread - 2; i++ {
			_semaphore <- struct{}{}
		}
	} else {
		_semaphore = make(chan struct{}, 1)
		_semaphore <- struct{}{}
	}
	
	_avifQueue = make(chan primitive.ObjectID, 100)
	go func() {
		for {
			_ = genAvifImage(<-_avifQueue)
		}
	}()
}

func InitCleanup() error {
	ci := C("image")
	_, err := ci.UpdateMany(
		Xd(10 * time.Second),
		bson.M{"files.hash": 0},
		bson.M{"$pull": bson.M{"files": bson.M{"hash": 0}}})
	return err
}

func GenAvif(r primitive.ObjectID) {
	_avifQueue <- r
}

func acquire() {
	<- _semaphore
}

func release() {
	_semaphore <- struct{}{}
}

func fromInt(h uint64) (string, string, string) {
	hash := fmt.Sprintf("%016x", h)
	return hash, hash[0:2], hash[15:16]
}

func fromString(hash string) (string, string) {
	return hash[0:2], hash[15:16]
}

func saveFile(b []byte, hash, name, ext string) error {
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, fmt.Sprintf("%s.%s", name, ext))
	_ = os.MkdirAll(path.Join(config.Site.Storage, "image", high, low, hash), os.ModeDir)
	return ioutil.WriteFile(p, b, os.ModePerm)
}

func removeFile(hash string) {
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash)
	_ = os.RemoveAll(p)
}

func removeFileSingle(hash, name, ext string) {
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, fmt.Sprintf("%s.%s", name, ext))
	_ = os.Remove(p)
}

func readFile(hash, name, ext string) ([]byte, error) {
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, fmt.Sprintf("%s.%s", name, ext))
	return ioutil.ReadFile(p)
}

func renameOriginal(hash, name, ext string) error {
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, "original.org")
	np := path.Join(config.Site.Storage, "image", high, low, hash, fmt.Sprintf("%s.%s", name, ext))
	return os.Rename(p, np)
}

func fileHash(b []byte) int64 {
	h := xxhash.Checksum64(b)
	
	if h == 0 {
		return 1
	}
	
	return int64(h)
}

type UploadSimpleQ struct {
	User primitive.ObjectID
	Name string
	Tag string
	Origins []string
	Data []byte
	GuessedType string
}

func getSpareHash(o uint64) (uint64, bool) {
	ci := C("image")
	
	hashExist := func(h uint64) int {
		if r := ci.FindOne(X(), bson.M{"location": fmt.Sprintf("%016x", h)}); r.Err() == nil {
			return 1
		} else if r.Err() == mongo.ErrNoDocuments {
			return 0
		} else {
			log.Printf("[Warn] failed check image hash exist: %s\n", r.Err())
			return -1
		}
	}
	
	offset := uint64(0)
	direction := false
	var result int
	for result = hashExist(o); result == 1; {
		// if the system has uint64(-1) images, then all available spaces are used.
		// but it really unlikely to happen, so we just ignore it.
		offset++
		direction = !direction
		if direction {
			o += offset
		} else {
			o -= offset
		}
	}
	
	if result == -1 {
		return 0, false
	}
	
	return o, true
}

func UploadSimple(r *UploadSimpleQ) (primitive.ObjectID, SErr) {
	f, t := Decode(r.Data, r.GuessedType)
	
	if f == nil {
		return primitive.ObjectID{}, EBadImage
	}
	
	var dJ, dW, dP []byte
	
	wg := sync.WaitGroup{}
	wg.Add(3)
	
	go func() {
		acquire()
		dJ = Encode(f, "jpeg")
		release()
		wg.Done()
	}()
	
	go func() {
		acquire()
		dW = Encode(f, "webp")
		release()
		wg.Done()
	}()
	
	go func() {
		defer wg.Done()
		acquire()
		defer release()
		x, y, w, h := GetSquare(f.W(), f.H())
		fP := native.RescaleFrame(f, x, y, w, h, uint32(config.Site.PreviewSize), uint32(config.Site.PreviewSize))
		if fP == nil {
			return
		}
		dP = Encode(fP, "jpeg")
	}()
	
	wg.Wait()
	
	if dJ == nil || dW == nil || dP == nil {
		return primitive.ObjectID{}, EEncodeFailed
	}
	
	hNum := xxhash.Checksum64(r.Data)
	
	hNum, ok := getSpareHash(hNum)
	
	if !ok {
		return primitive.ObjectID{}, EUnknown
	}
	
	files := make([]ImageFormat, 0, 2)
	
	hStr := fmt.Sprintf("%016x", hNum)
	
	if err := saveFile(dP, hStr, "preview", "jpeg"); err != nil {
		log.Printf("[Warn] failed saving file preview.jpeg: %s\n", err)
		removeFile(hStr)
		return primitive.ObjectID{}, EUnknown
	}
	
	min := len(r.Data)
	
	if t == "avif" {
		if err := saveFile(dJ, hStr, hStr, "jpeg"); err != nil {
			log.Printf("[Warn] failed saving file %s.jpg: %s\n", hStr, err)
			removeFile(hStr)
			return primitive.ObjectID{}, EUnknown
		}
		
		files = append(files, ImageFormat{
			Format: "jpeg",
			Hash:   fileHash(dJ),
		})
		
		if err := saveFile(dW, hStr, hStr, "webp"); err != nil {
			log.Printf("[Warn] failed saving file %s.webp: %s\n", hStr, err)
			removeFile(hStr)
			return primitive.ObjectID{}, EUnknown
		}
		
		files = append(files, ImageFormat{
			Format: "webp",
			Hash:   fileHash(dW),
		})
	} else if t == "webp" {
		if err := saveFile(dJ, hStr, hStr, "jpeg"); err != nil {
			log.Printf("[Warn] failed saving file %s.jpg: %s\n", hStr, err)
			removeFile(hStr)
			return primitive.ObjectID{}, EUnknown
		}
		
		files = append(files, ImageFormat{
			Format: "jpeg",
			Hash:   fileHash(dJ),
		})
		
		if len(dW) < len(r.Data) {
			if err := saveFile(dW, hStr, hStr, "webp"); err != nil {
				log.Printf("[Warn] failed saving file %s.webp: %s\n", hStr, err)
				removeFile(hStr)
				return primitive.ObjectID{}, EUnknown
			}
			
			files = append(files, ImageFormat{
				Format: "webp",
				Hash:   fileHash(dW),
			})
		} else {
			if err := saveFile(r.Data, hStr, hStr, "webp"); err != nil {
				log.Printf("[Warn] failed saving file %s.webp: %s\n", hStr, err)
				removeFile(hStr)
				return primitive.ObjectID{}, EUnknown
			}
			
			files = append(files, ImageFormat{
				Format: "webp",
				Hash:   fileHash(dW),
			})
		}
	} else {
		useOriginal := false
		
		if len(dJ) < min {
			if err := saveFile(dJ, hStr, hStr, "jpeg"); err != nil {
				log.Printf("[Warn] failed saving file %s.jpg: %s\n", hStr, err)
				removeFile(hStr)
				return primitive.ObjectID{}, EUnknown
			}
			
			min = len(dJ)
			files = append(files, ImageFormat{
				Format: "jpeg",
				Hash:   fileHash(dJ),
			})
		} else {
			useOriginal = true
		}
		
		if len(dW) < min {
			if err := saveFile(dW, hStr, hStr, "webp"); err != nil {
				log.Printf("[Warn] failed saving file %s.webp: %s\n", hStr, err)
				removeFile(hStr)
				return primitive.ObjectID{}, EUnknown
			}
			
			min = len(dW)
			files = append(files, ImageFormat{
				Format: "webp",
				Hash:   fileHash(dW),
			})
		} else if !useOriginal {
			useOriginal = true
		}
		
		if useOriginal {
			if err := saveFile(r.Data, hStr, hStr, t); err != nil {
				log.Printf("[Warn] failed saving file %s.%s: %s\n", hStr, t, err)
				removeFile(hStr)
				return primitive.ObjectID{}, EUnknown
			}
			
			files = append(files, ImageFormat{
				Format: t,
				Hash:   fileHash(r.Data),
			})
		}
	}
	
	if len(dW) < min {
		min = len(dW)
	}
	
	if len(dJ) < min {
		min = len(dJ)
	}
	
	if err := saveFile(r.Data, hStr, "original", "org"); err != nil {
		log.Printf("[Warn] failed saving file original.org: %s\n", err)
		removeFile(hStr)
		return primitive.ObjectID{}, EUnknown
	}
	
	id := primitive.NewObjectID()
	
	ci := C("image")
	if _, err := ci.InsertOne(X(), Image{
		ID:       id,
		UserID:   r.User,
		UserName: r.Name,
		Storage:  hStr,
		Tag:      r.Tag,
		Upload:   primitive.NewDateTimeFromTime(time.Now()),
		View:     0,
		Origins:  r.Origins,
		Original: true,
		Size:     min,
		Files:    files,
	}); err != nil {
		log.Printf("[Warn] failed inserting image: %s\n", err)
		removeFile(hStr)
		return primitive.ObjectID{}, EUnknown
	}
	
	return id, EOk
}

type ImageFile struct {
	Type string
	Data []byte
}

type UploadAdvancedQ struct {
	User primitive.ObjectID
	Name string
	Tag string
	Origins []string
	Files []ImageFile
}

var AllowType = map[string]struct{} {
	"jpeg": {},
	"png": {},
	"webp": {},
	"avif": {},
}

func UploadAdvanced(r *UploadAdvancedQ) (primitive.ObjectID, SErr) {
	if len(r.Files) == 0 {
		return primitive.ObjectID{}, EBadRequest
	}
	
	hNum := xxhash.Checksum64(r.Files[0].Data)
	
	f, _ := Decode(r.Files[0].Data, r.Files[0].Type)
	if f == nil {
		return primitive.ObjectID{}, EBadImage
	}
	
	acquire()
	x, y, w, h := GetSquare(f.W(), f.H())
	fP := native.RescaleFrame(f, x, y, w, h, uint32(config.Site.PreviewSize), uint32(config.Site.PreviewSize))
	if fP == nil {
		release()
		log.Println("[Warn] failed resizing preview.")
		return primitive.ObjectID{}, EEncodeFailed
	}
	dP := Encode(fP, "jpeg")
	if dP == nil {
		release()
		log.Println("[Warn] failed encoding preview.")
		return primitive.ObjectID{}, EEncodeFailed
	}
	release()
	
	hNum, ok := getSpareHash(hNum)
	
	if !ok {
		return primitive.ObjectID{}, EUnknown
	}
	
	hStr := fmt.Sprintf("%016x", hNum)
	
	if err := saveFile(dP, hStr, "preview", "jpeg"); err != nil {
		log.Printf("[Warn] failed saving file preview.jpeg: %s\n", err)
		removeFile(hStr)
		return primitive.ObjectID{}, EUnknown
	}
	
	files := make([]ImageFormat, 0, len(r.Files))
	
	for _, f := range r.Files {
		if _, exist := AllowType[f.Type]; !exist {
			continue
		}
		
		if err := saveFile(f.Data, hStr, hStr, f.Type); err != nil {
			log.Printf("[Warn] failed saving file %s.%s: %s\n", hStr, f.Type, err)
			removeFile(hStr)
			return primitive.ObjectID{}, EUnknown
		}
		
		files = append(files, ImageFormat{
			Format: f.Type,
			Hash:   fileHash(f.Data),
		})
	}
	
	if len(files) == 0 {
		return primitive.ObjectID{}, EBadRequest
	}
	
	id := primitive.NewObjectID()
	
	ci := C("image")
	if _, err := ci.InsertOne(X(), Image{
		ID:       id,
		UserID:   r.User,
		UserName: r.Name,
		Storage:  hStr,
		Tag:      r.Tag,
		Upload:   primitive.NewDateTimeFromTime(time.Now()),
		View:     0,
		Origins:  r.Origins,
		Original: false,
		Size:     0,
		Files:    files,
	}); err != nil {
		log.Printf("[Warn] failed inserting image: %s\n", err)
		removeFile(hStr)
		return primitive.ObjectID{}, EUnknown
	}
	
	return id, EOk
}

type UpdateImageQ struct {
	ID primitive.ObjectID
	Files []ImageFile
}

func UpdateImage(r *UpdateImageQ) SErr {
	if len(r.Files) == 0 {
		return EBadRequest
	}
	
	ci := C("image")
	
	im := &Image{}
	
	if u := ci.FindOne(X(), bson.M{"_id": r.ID}); u.Err() == nil {
		if err := u.Decode(im); err != nil {
			log.Printf("[Warn] failed loading image with id %s: %s\n", r.ID, err)
			return EUnknown
		}
	} else if u.Err() == mongo.ErrNoDocuments {
		return EImageNotExist
	} else {
		log.Printf("[Warn] failed finding image with id %s: %s\n", r.ID, u.Err())
		return EUnknown
	}
	
	hStr := im.Storage
	files := make([]ImageFormat, 0, len(r.Files) + len(im.Files))
	
	for _, f := range r.Files {
		if _, exist := AllowType[f.Type]; !exist {
			continue
		}
		
		if err := saveFile(f.Data, hStr, hStr, f.Type); err != nil {
			log.Printf("[Warn] failed saving file %s.%s: %s\n", hStr, f.Type, err)
			removeFileSingle(hStr, hStr, f.Type)
			continue
		}
		
		files = append(files, ImageFormat{
			Format: f.Type,
			Hash:   fileHash(f.Data),
		})
	}
	
	if len(files) == 0 {
		return EBadRequest
	}
	
	fMap := make(map[string]struct{})
	
	for _, f := range files {
		fMap[f.Format] = struct{}{}
	}
	
	for _, f := range im.Files {
		if _, exist := fMap[f.Format]; !exist {
			files = append(files, f)
		}
	}
	
	if im.Original {
		removeFileSingle(im.Storage, "original", "org")
	}
	
	if _, err := ci.UpdateOne(X(),
		bson.M{"_id": im.ID},
		bson.M{"$set": bson.M{"files": files, "original": false}}); err != nil {
		log.Printf("[Warn] failed inserting image: %s\n", err)
		return EUnknown
	}
	
	return EOk
}

func genAvifImage(r primitive.ObjectID) SErr {
	ci := C("image")
	
	im := &Image{}
	
	if u := ci.FindOne(X(), bson.M{"_id": r}); u.Err() == nil {
		if err := u.Decode(im); err != nil {
			log.Printf("[Warn] failed loading image with id %s: %s\n", r, err)
			return EUnknown
		}
	} else if u.Err() == mongo.ErrNoDocuments {
		return EImageNotExist
	} else {
		log.Printf("[Warn] failed finding image with id %s: %s\n", r, u.Err())
		return EUnknown
	}
	
	var err error
	var d []byte
	
	if im.Original {
		d, err = readFile(im.Storage, "original", "org")
	} else {
		return EMissingOriginal
	}
	
	if err != nil {
		log.Printf("[Warn] failed opening orginal image of %s: %s\n", im.Storage, err)
		return EUnknown
	}
	
	f, t := Decode(d, "")
	
	if f == nil {
		return EBadImage
	}
	
	dA := Encode(f, "avif")
	
	if dA == nil {
		return EEncodeFailed
	}
	
	if len(dA) >= im.Size {
		if t != "avif" {
			return EOk
		} else if err := renameOriginal(im.Storage, im.Storage, "avif"); err != nil {
				return EUnknown
		}
	} else {
		if err := saveFile(dA, im.Storage, im.Storage, "avif"); err != nil {
			log.Printf("[Warn] failed saving file %s.avif: %s\n", im.Storage, err)
			removeFileSingle(im.Storage, im.Storage, "avif")
			return EUnknown
		}
	}
	
	for i := range im.Files {
		if im.Files[i].Format == "avif" {
			im.Files[i].Hash = fileHash(dA)
			break
		}
	}
	
	if _, err := ci.UpdateOne(X(),
		bson.M{"_id": im.ID},
		bson.M{"$set": bson.M{"files": im.Files, "original": false}}); err != nil {
		log.Printf("[Warn] failed inserting image: %s\n", err)
		return EUnknown
	}
	
	if im.Original {
		removeFileSingle(im.Storage, "original", "org")
	}
	
	return EOk
}

func PostVisitImage(r primitive.ObjectID, emitAvif bool) SErr {
	ci := C("image")
	
	if _, err := ci.UpdateOne(X(), bson.M{"_id": r}, bson.M{"$inc": bson.M{"view": 1}}); err != nil {
		log.Printf("[Warn] failed update view count of image %s: %s\n",r , err)
		return EUnknown
	}
	
	if emitAvif {
		_, err := ci.UpdateOne(X(), bson.M{"_id": r}, bson.M{"$push": bson.M{"files": ImageFormat{
			Format: "avif",
			Hash:   0,
		}}})
		
		if err != nil {
			log.Printf("[Warn] failed adding avif placeholder of %s: %s\n", r, err)
			return EUnknown
		}
		
		GenAvif(r)
	}
	
	return EOk
}
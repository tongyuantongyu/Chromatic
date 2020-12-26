package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/json-iterator/go"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"io"
	"io/ioutil"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

func jsonResult(c *gin.Context, s SErr) {
	c.JSON(http.StatusOK, gin.H{
		"status": s,
	})
}

func jsonResultD(c *gin.Context, s SErr, d interface{}) {
	c.JSON(http.StatusOK, gin.H{
		"status": s,
		"data":   d,
	})
}

func abortWithError(c *gin.Context, s SErr) {
	jsonResult(c, s)
	// discard all pending stuffs
	_, _ = io.CopyN(ioutil.Discard, c.Request.Body, int64(config.Site.BodySize+10<<20))
	c.Abort()
}

// user api

func userExist(c *gin.Context) {
	name := c.Param("name")
	
	if name == "" {
		abortWithError(c, EBadRequest)
		return
	}
	
	u, r := UserExist(name)
	
	jsonResultD(c, r, u)
}

func register(c *gin.Context) {
	var j RegisterQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := Register(&j)
	
	jsonResult(c, r)
}

func login(c *gin.Context) {
	var j LoginQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	u, r := Login(&j)
	
	if r == EOk {
		if newJWT, err := CreateJWT(u); err == nil {
			c.Header("X-Update-Authorization", newJWT)
		} else {
			log.Printf("[Warn] failed generating new jwt: %s\n", err)
			r = EUnknown
		}
	}
	
	jsonResultD(c, r, u)
}

func getUser(c *gin.Context) {
	id := c.Param("id")
	
	if id == "" {
		abortWithError(c, EBadRequest)
		return
	}
	
	u, r := GetUser(id)
	
	jsonResultD(c, r, u)
}

func changePassword(c *gin.Context) {
	var j ChangePasswordQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	// u should exist and has type *User.
	u, _ := c.Get("user")
	r := ChangePassword(&j, u.(*User))
	
	jsonResult(c, r)
}

func readFormFile(fh *multipart.FileHeader) ([]byte, error) {
	f, err := fh.Open()
	if err != nil {
		return nil, err
	}
	
	return ioutil.ReadAll(f)
}

func setAvatar(c *gin.Context) {
	u, _ := c.Get("user")
	
	a, err := c.FormFile("avatar")
	if err != nil {
		abortWithError(c, EUnknown)
		return
	}
	
	d, err := readFormFile(a)
	if err != nil {
		abortWithError(c, EUnknown)
		return
	}
	
	r := SetAvatar(&SetAvatarQ{
		ID:   u.(*User).ID,
		Data: d,
	})
	
	jsonResult(c, r)
}

func resetAvatar(c *gin.Context) {
	u, _ := c.Get("user")
	
	removeAvatar(u.(*User).ID)
	
	jsonResult(c, EOk)
}

func setAvatarP(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.PostForm("id"))
	if err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	a, err := c.FormFile("avatar")
	if err != nil {
		abortWithError(c, EUnknown)
		return
	}
	
	d, err := readFormFile(a)
	if err != nil {
		abortWithError(c, EUnknown)
		return
	}
	
	r := SetAvatar(&SetAvatarQ{
		ID:   id,
		Data: d,
	})
	
	jsonResult(c, r)
}

func resetAvatarP(c *gin.Context) {
	id, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	removeAvatar(id)
	
	jsonResult(c, EOk)
}

func listUser(c *gin.Context) {
	var j ListUserQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListUser(&j)
	
	jsonResultD(c, r, p)
}

func addUser(c *gin.Context) {
	var j AddUserQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := AddUser(&j)
	
	jsonResult(c, r)
}

func removeUser(c *gin.Context) {
	var j RemoveUserQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := RemoveUser(&j)
	
	jsonResult(c, r)
}

func setPassword(c *gin.Context) {
	var j SetPasswordQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := SetPassword(&j)
	
	jsonResult(c, r)
}

func setUserPermission(c *gin.Context) {
	var j SetUserPermissionQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := SetUserPermission(&j)
	
	jsonResult(c, r)
}

func listInvite(c *gin.Context) {
	var j ListInviteQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListInvite(&j)
	
	jsonResultD(c, r, p)
}

func addInvite(c *gin.Context) {
	var j InviteCode
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := AddInvite(&j)
	
	jsonResult(c, r)
}

func removeInvite(c *gin.Context) {
	code := c.Param("code")
	
	if code == "" {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := RemoveInvite(code)
	
	jsonResult(c, r)
}

func setInviteTimes(c *gin.Context) {
	var j InviteCode
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := SetInviteTimes(&j)
	
	jsonResult(c, r)
}

// gallery api

func listImage(c *gin.Context) {
	var j ListImageQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListImage(&j)
	
	jsonResultD(c, r, p)
}

func listImageTags(c *gin.Context) {
	strId := c.Param("id")
	
	id, err := primitive.ObjectIDFromHex(strId)
	
	if err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListImageTags(id)
	
	jsonResultD(c, r, p)
}

func listImageWithTag(c *gin.Context) {
	var j ListImageWithTagQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListImageWithTag(&j)
	
	jsonResultD(c, r, p)
}

func listImageContainsTag(c *gin.Context) {
	var j ListImageContainsTagQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := ListImageContainsTag(&j)
	
	jsonResultD(c, r, p)
}

func setImageInfo(c *gin.Context) {
	var j SetImageInfoQ
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	u, _ := c.Get("user_id")
	var r SErr
	
	if u == nil {
		r = SetImageInfo(&j, nil)
	} else {
		r = SetImageInfo(&j, u.(*primitive.ObjectID))
	}
	
	jsonResult(c, r)
}

func getImage(c *gin.Context) {
	strId := c.Param("id")
	
	id, err := primitive.ObjectIDFromHex(strId)
	
	if err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := GetImage(id)
	
	jsonResultD(c, r, p)
}

func removeImage(c *gin.Context) {
	var j struct {
		Ids []primitive.ObjectID `json:"ids" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&j); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	u, _ := c.Get("user_id")
	var r SErr
	
	if u == nil {
		r = RemoveImage(j.Ids, nil)
	} else {
		r = RemoveImage(j.Ids, u.(*primitive.ObjectID))
	}
	
	jsonResult(c, r)
}

// image api

func uploadSimple(c *gin.Context) {
	q := struct {
		Tag     string                `form:"tag"`
		Origins string                `form:"origins"`
		Image   *multipart.FileHeader `form:"image" binding:"required"`
	}{}
	
	if err := c.ShouldBind(&q); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	j := UploadSimpleQ{}
	
	_u, _ := c.Get("user")
	u, ok := _u.(*User)
	
	if !ok {
		abortWithError(c, EUnknown)
		return
	}
	
	j.User = u.ID
	j.Name = u.Name
	j.Tag = q.Tag
	j.Origins = CleanOrigins(q.Origins)
	
	filename := q.Image.Filename
	if p := strings.LastIndexByte(filename, '.'); p != -1 {
		j.GuessedType = filename[p:]
	}
	
	d, err := readFormFile(q.Image)
	if err != nil {
		abortWithError(c, EUnknown)
		return
	}
	
	j.Data = d
	
	p, r := UploadSimple(&j)
	
	jsonResultD(c, r, p)
}

func uploadAdvanced(c *gin.Context) {
	q := struct {
		Tag     string                  `form:"tag"`
		Origins string                  `form:"origins"`
		Images  []*multipart.FileHeader `form:"images" binding:"required"`
	}{}
	
	if err := c.ShouldBind(&q); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	j := UploadAdvancedQ{}
	
	_u, _ := c.Get("user")
	u, ok := _u.(*User)
	
	if !ok {
		abortWithError(c, EUnknown)
		return
	}
	
	j.User = u.ID
	j.Name = u.Name
	j.Tag = q.Tag
	j.Origins = CleanOrigins(q.Origins)
	j.Files = make([]ImageFile, 0, 4)
	
	e := make(map[string]struct{})
	
	for _, i := range q.Images {
		if _, exist := AllowType[i.Filename]; !exist {
			continue
		}
		
		if _, exist := e[i.Filename]; exist {
			continue
		}
		
		d, err := readFormFile(i)
		if err != nil {
			abortWithError(c, EUnknown)
			return
		}
		
		j.Files = append(j.Files, ImageFile{
			Type: i.Filename,
			Data: d,
		})
		
		e[i.Filename] = struct {}{}
	}
	
	if len(j.Files) == 0 {
		abortWithError(c, EBadRequest)
		return
	}
	
	p, r := UploadAdvanced(&j)
	
	jsonResultD(c, r, p)
}

func updateImage(c *gin.Context) {
	q := struct {
		Id      string                  `form:"id" binding:"required"`
		Images  []*multipart.FileHeader `form:"images" binding:"required"`
	}{}
	
	if err := c.ShouldBind(&q); err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	j := UpdateImageQ{}
	
	id, err := primitive.ObjectIDFromHex(q.Id)
	
	if err != nil {
		abortWithError(c, EBadRequest)
		return
	}
	
	j.ID = id
	j.Files = make([]ImageFile, 0, 4)
	
	e := make(map[string]struct{})
	
	for _, i := range q.Images {
		if _, exist := AllowType[i.Filename]; !exist {
			continue
		}
		
		if _, exist := e[i.Filename]; exist {
			continue
		}
		
		d, err := readFormFile(i)
		if err != nil {
			abortWithError(c, EUnknown)
			return
		}
		
		j.Files = append(j.Files, ImageFile{
			Type: i.Filename,
			Data: d,
		})
		
		e[i.Filename] = struct {}{}
	}
	
	if len(j.Files) == 0 {
		abortWithError(c, EBadRequest)
		return
	}
	
	r := UpdateImage(&j)
	
	jsonResult(c, r)
}

// image serve api

func getImageFile(c *gin.Context) {
	_id := strings.TrimSuffix(c.Param("id"), ".i")
	
	id, err := primitive.ObjectIDFromHex(_id)
	
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	
	var compatSupport []string
	
	accept := c.GetHeader("Accept")
	ua := c.GetHeader("User-Agent")
	
	if strings.Contains(accept, "image/avif") {
		compatSupport = append(compatSupport, "avif")
	}
	
	// stupid (old) edge doesn't claims itself to support webp, despite it actually do
	// Flutter(Dart) actually support webp, enable it
	if strings.Contains(accept, "image/webp") ||
		strings.Contains(ua, "Edge/18") ||
		strings.Contains(ua, "dart:io") {
		compatSupport = append(compatSupport, "webp")
	}
	
	compatSupport = append(compatSupport, "jpeg", "png")
	
	var rawPref []string
	var preference []string
	
	if pref, err := c.Cookie("Preference"); err != nil {
		preference = compatSupport
	} else if err := json.UnmarshalFromString(pref, &rawPref); err != nil {
		preference = compatSupport
	} else {
		_map := make(map[string]struct{})
		
		for _, t := range rawPref {
			if _, exist := AllowType[t]; exist {
				_map[t] = struct {}{}
				preference = append(preference, t)
			}
		}
		
		for _, t := range compatSupport {
			if _, exist := _map[t]; !exist {
				preference = append(preference, t)
			}
		}
	}
	
	origin := ""
	scheme := "http"
	if org := c.GetHeader("Origin"); org != "" {
		u, err := url.Parse(org)
		if err == nil {
			origin = u.Host
			scheme = u.Scheme
		} else if err.Error() == "missing protocol scheme" {
			if u, err := url.Parse("http://" + org); err == nil {
				origin = u.Host
			}
		}
	}
	
	if origin == "" {
		if ref := c.GetHeader("Referer"); ref != "" {
			u, err := url.Parse(ref)
			if err == nil {
				origin = u.Host
				scheme = u.Scheme
			} else if err.Error() == "missing protocol scheme" {
				if u, err := url.Parse("http://" + ref); err == nil {
					origin = u.Host
				}
			}
		}
	}
	
	im, err := GetImage(id)
	
	c.Header("Vary", "Accept, User-Agent, Origin, Referer")
	
	if err == EImageNotExist {
		c.Status(http.StatusNotFound)
		return
	} else if err != EOk {
		c.Status(http.StatusInternalServerError)
		return
	}
	
	//goland:noinspection GoNilness
	if origin == config.Site.Host {
	} else if VerifyHostname(origin, im.Origins) {
		if origin != "" {
			c.Header("Access-Control-Allow-Origin", fmt.Sprintf("%s://%s", scheme, origin))
		} else {
			c.Header("Access-Control-Allow-Origin", fmt.Sprintf("https://%s", c.Request.Host))
		}
	} else {
		c.Status(http.StatusForbidden)
		return
	}
	
	avail := make(map[string]int64)
	hasAvif := false
	
	//goland:noinspection GoNilness
	for _, i := range im.Files {
		if i.Hash != 0 {
			avail[i.Format] = i.Hash
		}
		
		if i.Format == "avif" {
			hasAvif = true
		}
	}
	
	var ext string
	var tag uint64
	
	for _, t := range preference {
		if h, exist := avail[t]; exist {
			ext = t
			tag = uint64(h)
			break
		}
	}
	
	if ext == "" {
		c.Status(http.StatusNotFound)
		return
	}
	
	if eTag := c.GetHeader("If-None-Match"); eTag != "" {
		if eTag == strconv.FormatUint(tag, 16) {
			c.Set("Served-Ext", "cache")
			c.Status(http.StatusNotModified)
			return
		}
	}
	
	//goland:noinspection GoNilness
	hash := im.Storage
	
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, fmt.Sprintf("%s.%s", hash, ext))
	
	c.Header("Content-Type", "image/" + ext)
	c.Header("ETag", strconv.FormatUint(tag, 16))
	c.File(p)
	c.Set("Served-Ext", ext)
	
	//goland:noinspection GoNilness
	if origin != config.Site.Host {
		if !hasAvif && im.View > config.Site.AvifThreshold - 1 {
			_ = PostVisitImage(im.ID, true)
		} else {
			_ = PostVisitImage(im.ID, false)
		}
	}

}

func getImagePreview(c *gin.Context) {
	_id := strings.TrimSuffix(c.Param("id"), ".i")
	
	id, err := primitive.ObjectIDFromHex(_id)
	
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	
	im, err := GetImage(id)
	
	if err == EImageNotExist {
		c.Status(http.StatusNotFound)
		return
	} else if err != EOk {
		c.Status(http.StatusInternalServerError)
		return
	}
	
	//goland:noinspection GoNilness
	hash := im.Storage
	
	high, low := fromString(hash)
	p := path.Join(config.Site.Storage, "image", high, low, hash, "preview.jpeg")
	
	c.Header("Content-Type", "image/jpeg")
	c.File(p)
}

func setFormatPreference(c *gin.Context) {
	pRaw := c.PostForm("preference")
	
	var p []string
	
	for _, f := range strings.Split(pRaw, ",") {
		if _, exist := AllowType[f]; exist {
			p = append(p, f)
		}
	}
	
	if len(p) == 0 {
		abortWithError(c, EBadRequest)
		return
	}
	
	if s, err := json.Marshal(p); err != nil {
		log.Printf("[Warn] failed marshaling preference array: %s\n", err)
		abortWithError(c, EUnknown)
	} else {
		c.SetSameSite(http.SameSiteNoneMode)
		c.SetCookie("Preference", string(s), 0, "", "", false, false)
	}
}

func getAvatarFile(c *gin.Context) {
	idStr := strings.TrimSuffix(c.Param("id"), ".i")
	
	id, err := primitive.ObjectIDFromHex(idStr)
	
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	
	cu := C("user")
	
	if n := cu.FindOne(X(), bson.M{"_id": id}); n.Err() == mongo.ErrNoDocuments {
		c.Status(http.StatusNotFound)
		return
	} else if n.Err() != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	
	high := idStr[6:8]
	low := idStr[10:12]
	p := path.Join(config.Site.Storage, "avatar", high, low, idStr+".jpeg")
	c.Header("Content-Type", "image/jpeg")
	c.File(p)
}

func ServeStatic(prefix string) gin.HandlerFunc {
	fs := FileServer(gin.Dir(config.Site.Static, false))
	if prefix != "" {
		fs = http.StripPrefix(prefix, fs)
	}
	return func(c *gin.Context) {
		fs.ServeHTTP(c.Writer, c.Request)
	}
}
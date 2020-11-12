package main

import (
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
)

type ListImageQ struct {
	UserID primitive.ObjectID `json:"id" binding:"required"`
	Sort   string             `json:"sort" binding:"required"`
	Offset uint               `json:"offset"`
	Limit  uint               `json:"limit"`
}

type ListImageP struct {
	Total  uint64  `json:"total"`
	Count  uint64  `json:"count"`
	Images []Image `json:"images"`
}

func ListImage(r *ListImageQ) (*ListImageP, SErr) {
	if r.Sort != "tag" && r.Sort != "upload" {
		return nil, EBadRequest
	}
	
	if r.Limit > uint(config.Site.MaxList) {
		return nil, EBadRequest
	}
	
	ci := C("image")
	cu := C("user")
	
	if n := cu.FindOne(X(), bson.M{"_id": r.UserID}); n.Err() == mongo.ErrNoDocuments {
		return nil, EUserNotExist
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed checking user exist: %s", n.Err())
		return nil, EUnknown
	}
	
	p := &ListImageP{}
	
	n, err := ci.CountDocuments(X(), bson.M{"user_id": r.UserID})
	
	if err != nil {
		log.Printf("[Warn] Failed counting images: %s", err)
		return nil, EUnknown
	}
	
	p.Total = uint64(n)
	
	if n-int64(r.Offset) <= 0 || r.Limit == 0 {
		return p, EOk
	}
	
	p.Images = make([]Image, 0, r.Limit)
	
	opts := options.Find()
	opts.SetSkip(int64(r.Offset))
	opts.SetLimit(int64(r.Limit))
	if r.Sort == "tag" {
		opts.SetSort(bson.D{{"tag", 1}, {"upload", 1}})
	} else {
		opts.SetSort(bson.D{{"upload", 1}})
	}
	opts.SetProjection(bson.M{
		"user_id":   1,
		"user_name": 1,
		"tag":       1,
		"upload":    1,
		"view":      1,
		"origins":   1,
	})
	
	cur, err := ci.Find(X(), bson.M{"user_id": r.UserID}, opts)
	
	if err == mongo.ErrNoDocuments {
		p.Count = 0
		return p, EOk
	} else if err != nil {
		log.Printf("[Warn] Failed reading images info: %s", err)
		return nil, EUnknown
	}
	
	if err = cur.All(X(), &p.Images); err != nil {
		log.Printf("[Warn] Failed loading images info: %s", err)
		return nil, EUnknown
	}
	
	p.Count = uint64(len(p.Images))
	return p, EOk
}

func ListImageTags(r primitive.ObjectID) ([]string, SErr) {
	ci := C("image")
	cu := C("user")
	
	if n := cu.FindOne(X(), bson.M{"_id": r}); n.Err() == mongo.ErrNoDocuments {
		return nil, EUserNotExist
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed checking user exist: %s", n.Err())
		return nil, EUnknown
	}
	
	tags, err := ci.Distinct(X(), "tag", bson.M{"user_id": r})
	
	if err != nil {
		log.Printf("[Warn] Failed loading tags: %s", err)
		return nil, EUnknown
	}
	
	s := make([]string, 0, len(tags))
	
	for _, t := range tags {
		if st, ok := t.(string); ok {
			s = append(s, st)
		}
	}
	
	return s, EOk
}

type ListImageWithTagQ struct {
	UserID primitive.ObjectID `json:"id" binding:"required"`
	Tag    string             `json:"tag"`
	Offset uint               `json:"offset"`
	Limit  uint               `json:"limit" binding:"required"`
}

func ListImageWithTag(r *ListImageWithTagQ) (*ListImageP, SErr) {
	if r.Limit > uint(config.Site.MaxList) {
		return nil, EBadRequest
	}
	
	ci := C("image")
	cu := C("user")
	
	if n := cu.FindOne(X(), bson.M{"_id": r.UserID}); n.Err() == mongo.ErrNoDocuments {
		return nil, EUserNotExist
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed checking user exist: %s", n.Err())
		return nil, EUnknown
	}
	
	p := &ListImageP{}
	
	n, err := ci.CountDocuments(X(), bson.M{"user_id": r.UserID, "tag": r.Tag})
	
	if err != nil {
		log.Printf("[Warn] Failed counting images: %s", err)
		return nil, EUnknown
	}
	
	p.Total = uint64(n)
	
	if n-int64(r.Offset) <= 0 {
		return p, EOk
	}
	
	p.Images = make([]Image, 0, r.Limit)
	
	opts := options.Find()
	opts.SetSkip(int64(r.Offset))
	opts.SetLimit(int64(r.Limit))
	opts.SetSort(bson.D{{"upload", 1}})
	opts.SetProjection(bson.M{
		"user_id":   1,
		"user_name": 1,
		"tag":       1,
		"upload":    1,
		"view":      1,
		"origins":   1,
	})
	
	cur, err := ci.Find(X(), bson.M{"user_id": r.UserID, "tag": r.Tag}, opts)
	
	if err == mongo.ErrNoDocuments {
		p.Count = 0
		return p, EOk
	} else if err != nil {
		log.Printf("[Warn] Failed reading images info: %s", err)
		return nil, EUnknown
	}
	
	if err = cur.All(X(), &p.Images); err != nil {
		log.Printf("[Warn] Failed loading images info: %s", err)
		return nil, EUnknown
	}
	
	p.Count = uint64(len(p.Images))
	return p, EOk
}

type ListImageContainsTagQ struct {
	UserID primitive.ObjectID `json:"id" binding:"required"`
	Tag    string             `json:"tag"`
	Offset uint               `json:"offset"`
	Limit  uint               `json:"limit" binding:"required"`
}

func ListImageContainsTag(r *ListImageContainsTagQ) (*ListImageP, SErr) {
	if r.Limit > uint(config.Site.MaxList) {
		return nil, EBadRequest
	}
	
	ci := C("image")
	cu := C("user")
	
	if n := cu.FindOne(X(), bson.M{"_id": r.UserID}); n.Err() == mongo.ErrNoDocuments {
		return nil, EUserNotExist
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed checking user exist: %s", n.Err())
		return nil, EUnknown
	}
	
	p := &ListImageP{}
	
	cCur, err := ci.Aggregate(X(), mongo.Pipeline{
		bson.D{{"$match", bson.M{
			"user_id": r.UserID,
		}}},
		bson.D{{"$project", bson.M{
			"offset": bson.M{"$indexOfCP": bson.A{"$tag", r.Tag}},
		}}},
		bson.D{{"$match", bson.M{
			"offset": bson.M{"$ne": -1},
		}}},
		bson.D{{"$count", "count"}},
	})
	
	if err != nil {
		log.Printf("[Warn] Failed counting images: %s", err)
		return nil, EUnknown
	}
	
	cS := struct {
		Count uint64 `bson:"count"`
	}{}
	_ = cCur.Next(X())
	err = cCur.Decode(&cS)
	
	if err != nil {
		log.Printf("[Warn] Failed reading image count: %s\n", err)
		return nil, EUnknown
	}
	
	p.Total = cS.Count
	
	if int64(cS.Count)-int64(r.Offset) <= 0 {
		return p, EOk
	}
	
	p.Images = make([]Image, 0, r.Limit)
	
	cur, err := ci.Aggregate(X(), mongo.Pipeline{
		bson.D{{"$match", bson.M{
			"user_id": r.UserID,
		}}},
		bson.D{{"$project", bson.M{
			"user_id":   1,
			"user_name": 1,
			"tag":       1,
			"upload":    1,
			"view":      1,
			"origins":   1,
			"offset": bson.M{"$indexOfCP": bson.A{"$tag", r.Tag}},
		}}},
		bson.D{{"$match", bson.M{
			"offset": bson.M{"$ne": -1},
		}}},
		bson.D{{"$sort", bson.D{
			{"tag", 1},
			{"offset", 1},
			{"upload", 1},
		}}},
		bson.D{{"$skip", r.Offset}},
		bson.D{{"$limit", r.Limit}},
	})
	
	if err == mongo.ErrNoDocuments {
		p.Count = 0
		return p, EOk
	} else if err != nil {
		log.Printf("[Warn] Failed reading images info: %s", err)
		return nil, EUnknown
	}
	
	if err = cur.All(X(), &p.Images); err != nil {
		log.Printf("[Warn] Failed loading images info: %s", err)
		return nil, EUnknown
	}
	
	p.Count = uint64(len(p.Images))
	return p, EOk
}

func RemoveImage(r []primitive.ObjectID, u *primitive.ObjectID) SErr {
	ci := C("image")
	
	var filter bson.M
	if u == nil {
		filter = bson.M{"_id": bson.M{"$in": r}}
	} else {
		filter = bson.M{"_id": bson.M{"$in": r}, "user_id": *u}
	}
	
	tags, err := ci.Distinct(X(), "storage", filter)
	
	if err != nil {
		log.Printf("[Warn] Failed getting storage locations of images: %s\n", err)
		return EUnknown
	}
	
	if _, err := ci.DeleteMany(X(), filter); err != nil {
		log.Printf("[Warn] Failed deleting images: %s\n", err)
		return EUnknown
	}
	
	for _, d := range tags {
		if dir, ok := d.(string); ok {
			removeFile(dir)
		}
	}
	
	return EOk
}

type SetImageInfoQ struct {
	Targets []primitive.ObjectID `json:"targets" binding:"required"`
	Field   string               `json:"field" binding:"required"`
	Data    string               `json:"data"`
}

func SetImageInfo(r *SetImageInfoQ, u *primitive.ObjectID) SErr {
	var filter bson.M
	if u == nil {
		filter = bson.M{"_id": bson.M{"$in": r.Targets}}
	} else {
		filter = bson.M{"_id": bson.M{"$in": r.Targets}, "user_id": *u}
	}
	
	if r.Field == "tag" {
		ci := C("image")
		
		if _, err := ci.UpdateMany(X(), filter,
			bson.M{"$set": bson.M{"tag": r.Data}}); err != nil {
			log.Printf("[Warn] Failed update images tag: %s", err)
			return EUnknown
		} else {
			return EOk
		}
	} else if r.Field == "origins" {
		ci := C("image")
		
		if _, err := ci.UpdateMany(X(), filter,
			bson.M{"$set": bson.M{"origins": CleanOrigins(r.Data)}}); err != nil {
			log.Printf("[Warn] Failed update images origins: %s", err)
			return EUnknown
		} else {
			return EOk
		}
	}
	
	return EBadRequest
}

func GetImage(r primitive.ObjectID) (*Image, SErr) {
	ci := C("image")
	
	if n := ci.FindOne(X(), bson.M{"_id": r}); n.Err() == mongo.ErrNoDocuments {
		return nil, EImageNotExist
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed finding image: %s", n.Err())
		return nil, EUnknown
	} else {
		i := &Image{}
		if err := n.Decode(i); err != nil {
			log.Printf("[Warn] Failed reading image: %s", n.Err())
			return nil, EUnknown
		}
		return i, EOk
	}
}

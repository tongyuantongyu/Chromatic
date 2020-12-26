package main

import (
	"ImageServer/native"
	"crypto/subtle"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"io/ioutil"
	"log"
	"os"
	"path"
	"time"
)

var AdminID primitive.ObjectID

func InitUser() {
	m := C("user").FindOne(X(), bson.M{"name": "admin"})
	
	if m.Err() == nil {
		if config.Site.Debug {
			log.Println("[Info] Admin account exist, skip bootstrap.")
		}
		
		u := &User{}
		err := m.Decode(u)
		
		if err != nil {
			log.Fatalf("Failed loading admin info: %s", err)
		}
		
		AdminID = u.ID
		return
	} else if m.Err() != mongo.ErrNoDocuments {
		log.Fatalf("Failed reading `user` collection: %s", m.Err())
	}
	
	AdminID = primitive.NewObjectID()
	
	_, err := C("user").InsertOne(X(), &User{
		ID:         AdminID,
		Name:       "admin",
		Password:   PasswordHash(config.Security.AdminPassword),
		Privileged: true,
	})
	
	if err != nil {
		log.Fatalf("Failed creating system admin account: %s", err)
	}
}

func UserExist(name string) (bool, SErr) {
	cu := C("user")
	
	n := cu.FindOne(X(), bson.M{"name": name})
	
	if n.Err() == mongo.ErrNoDocuments {
		return false, EOk
	} else if n.Err() != nil {
		log.Printf("[Warn] Failed checking user named `%s` exist: %s\n", name, n.Err())
		return false, EUnknown
	}
	
	return true, EOk
}

type RegisterQ struct {
	Name       string `json:"name" binding:"required"`
	Password   string `json:"password" binding:"required"`
	InviteCode string `json:"invite_code" binding:"required"`
	Recaptcha  string `json:"recaptcha" binding:"required"`
}

func Register(r *RegisterQ) SErr {
	cu := C("user")
	
	if e := RecaptchaVerify(r.Recaptcha); e != EOk {
		return e
	}
	
	if !PasswordVerify(r.Password) {
		if config.Site.Debug {
			log.Printf("[Info] Some tries to register with name `%s` but weak password.\n", r.Name)
		}
		return EWeakPassword
	}
	
	e, serr := UserExist(r.Name)
	
	if serr != EOk {
		return serr
	}
	
	if e {
		return EUserExist
	}
	
	code := &InviteCode{}
	
	ci := C("invite")
	
	m := ci.FindOne(X(), bson.M{"code": r.InviteCode})
	
	if m.Err() == mongo.ErrNoDocuments {
		return EInvalidInviteCode
	} else if m.Err() != nil {
		log.Printf("[Warn] Failed checking invite code `%s` is valid: %s\n", r.InviteCode, m.Err())
		return EUnknown
	}
	
	if err := m.Decode(code); err != nil {
		log.Printf("[Warn] Failed loading invite code info: %s\n", err)
		return EUnknown
	}
	
	if code.Times > 0 {
		_, err := ci.UpdateOne(X(),
			bson.M{"code": r.InviteCode},
			bson.M{"$inc": bson.M{"times": -1}})
		
		if err != nil {
			log.Printf("[Warn] Failed updating count of invite code `%s`: %s\n", r.InviteCode, err)
			return EUnknown
		}
	} else {
		if config.Site.Debug {
			log.Printf("[Info] Some tries to register with expired invite code `%s`.\n", r.InviteCode)
		}
		return EInvalidInviteCode
	}
	
	if config.Site.Debug {
		log.Printf("[Info] `%s` registered with invite code `%s.\n", r.Name, r.InviteCode)
	}
	
	_, err := cu.InsertOne(X(), &User{
		ID:         primitive.NewObjectID(),
		Name:       r.Name,
		Password:   PasswordHash(r.Password),
		Privileged: false,
		Frozen:     false,
		VersionP:   0,
		VersionC:   0,
	})
	
	if err != nil {
		log.Printf("[Warn] Failed adding user `%s`: %s\n", r.Name, err)
		return EUnknown
	}
	
	return EOk
}

type LoginQ struct {
	Name      string `json:"name" binding:"required"`
	Password  string `json:"password" binding:"required"`
	Recaptcha string `json:"recaptcha" binding:"required"`
}

func Login(r *LoginQ) (*User, SErr) {
	//if e := RecaptchaVerify(r.Recaptcha); e != EOk {
	//	return nil, e
	//}
	
	u := &User{}
	
	cu := C("user")
	
	m := cu.FindOne(X(), bson.M{"name": r.Name})
	
	if m.Err() == mongo.ErrNoDocuments {
		if config.Site.Debug {
			log.Printf("[Info] Some tries login to nonexist account `%s`.\n", r.Name)
		}
		return nil, EBadCredential
	} else if m.Err() != nil {
		log.Printf("[Warn] Failed checking if user `%s` exist: %s\n", r.Name, m.Err())
		return nil, EUnknown
	}
	
	if err := m.Decode(u); err != nil {
		log.Printf("[Warn] Failed loading user: %s\n", err)
		return nil, EUnknown
	}
	
	if subtle.ConstantTimeCompare(PasswordHash(r.Password), u.Password) == 0 {
		if config.Site.Debug {
			log.Printf("[Info] Some tries login to account `%s` with wrong credential.\n", r.Name)
		}
		return nil, EBadCredential
	}
	
	return u, EOk
}

func GetUser(r string) (*User, SErr) {
	id, err := primitive.ObjectIDFromHex(r)
	var filter bson.M
	if err == nil {
		filter = bson.M{"_id": id}
	} else {
		filter = bson.M{"name": r}
	}
	
	u := &User{}
	
	cu := C("user")
	
	m := cu.FindOne(X(), filter)
	
	if m.Err() == mongo.ErrNoDocuments {
		return nil, EUserNotExist
	} else if m.Err() != nil {
		log.Printf("[Warn] Failed get user `%s`: %s\n", r, m.Err())
		return nil, EUnknown
	}
	
	if err := m.Decode(u); err != nil {
		log.Printf("[Warn] Failed loading user: %s\n", err)
		return nil, EUnknown
	}
	
	return u, EOk
}

type ChangePasswordQ struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

func ChangePassword(r *ChangePasswordQ, u *User) SErr {
	if subtle.ConstantTimeCompare(PasswordHash(r.OldPassword), u.Password) == 0 {
		if config.Site.Debug {
			log.Printf("[Info] User `%s` tries to change password with wrong credential.\n", u.Name)
		}
		return EBadCredential
	}
	
	if !PasswordVerify(r.NewPassword) {
		if config.Site.Debug {
			log.Printf("[Info] User `%s` tries to change to a weak password.\n", u.Name)
		}
		return EWeakPassword
	}
	
	cu := C("user")
	
	_, err := cu.UpdateOne(X(),
		bson.M{"_id": u.ID},
		bson.M{
			"$inc": bson.M{"version_p": 1},
			"$set": bson.M{"password": PasswordHash(r.NewPassword)},
		})
	
	if err != nil {
		log.Printf("[Warn] Failed updating password of `%s`: %s\n", u.Name, err)
		return EUnknown
	}
	
	return EOk
}

type SetAvatarQ struct {
	ID   primitive.ObjectID
	Data []byte
}

func saveAvatar(b []byte, id primitive.ObjectID) error {
	h := id.Hex()
	high := h[6:8]
	low := h[10:12]
	p := path.Join(config.Site.Storage, "avatar", high, low, h+".jpeg")
	_ = os.MkdirAll(path.Join(config.Site.Storage, "avatar", high, low), os.ModeDir)
	return ioutil.WriteFile(p, b, os.ModePerm)
}

func removeAvatar(id primitive.ObjectID) {
	h := id.Hex()
	high := h[6:8]
	low := h[10:12]
	p := path.Join(config.Site.Storage, "avatar", high, low, h+".jpeg")
	_ = os.Remove(p)
}

func SetAvatar(r *SetAvatarQ) SErr {
	f, _ := Decode(r.Data, "")
	if f == nil {
		return EBadImage
	}
	
	var d []byte
	
	if f.W() == f.H() && f.W() <= 256 {
		d = Encode(f, "jpeg")
	} else {
		x, y, w, h := GetSquare(f.W(), f.H())
		fR := native.RescaleFrame(f, x, y, w, h, uint32(config.Site.AvatarSize), uint32(config.Site.AvatarSize))
		if fR == nil {
			log.Println("[Warn] Failed resizing avatar.")
			return EEncodeFailed
		}
		
		d = Encode(fR, "jpeg")
	}
	
	if err := saveAvatar(d, r.ID); err != nil {
		log.Printf("[Warn] Failed saving avatar: %s.", err)
		return EUnknown
	}
	
	return EOk
}

type ListUserQ struct {
	Offset  uint   `json:"offset"`
	Limit   uint   `json:"limit" binding:"required"`
	Keyword string `json:"keyword"`
}

type ListUserP struct {
	Total uint   `json:"total"`
	Count uint   `json:"count"`
	Users []User `json:"users"`
}

func ListUser(r *ListUserQ) (*ListUserP, SErr) {
	cu := C("user")
	
	cCur, err := cu.Aggregate(X(), mongo.Pipeline{
		bson.D{{"$match", bson.M{
			"_id": bson.M{"$ne": AdminID},
		}}},
		bson.D{{"$project", bson.M{
			"offset": bson.M{"$indexOfCP": bson.A{"$name", r.Keyword}},
		}}},
		bson.D{{"$match", bson.M{
			"offset": bson.M{"$ne": -1},
		}}},
		bson.D{{"$count", "count"}},
	})
	
	if err != nil {
		log.Printf("[Warn] Failed counting users with keyword `%s`: %s\n", r.Keyword, err)
		return nil, EUnknown
	}
	
	cS := struct {
		Count uint `bson:"count"`
	}{}
	_ = cCur.Next(X())
	err = cCur.Decode(&cS)
	
	if err != nil {
		log.Printf("[Warn] Failed reading user count: %s\n", err)
		return nil, EUnknown
	}
	
	cur, err := cu.Aggregate(X(), mongo.Pipeline{
		bson.D{{"$match", bson.M{
			"_id": bson.M{"$ne": AdminID},
		}}},
		bson.D{{"$project", bson.M{
			"name":       1,
			"avatar":     1,
			"privileged": 1,
			"frozen":     1,
			"offset":     bson.M{"$indexOfCP": bson.A{"$name", r.Keyword}},
		}}},
		bson.D{{"$match", bson.M{
			"offset": bson.M{"$ne": -1},
		}}},
		bson.D{{"$sort", bson.D{
			{"offset", 1},
			{"name", 1},
		}}},
		bson.D{{"$skip", r.Offset}},
		bson.D{{"$limit", r.Limit}},
	})
	
	if err != nil {
		log.Printf("[Warn] Failed searching users with keyword `%s`: %s\n", r.Keyword, err)
		return nil, EUnknown
	}
	
	if cur.Err() == mongo.ErrNoDocuments {
		return &ListUserP{
			Total: cS.Count,
			Count: 0,
			Users: nil,
		}, EOk
	}
	
	result := &ListUserP{
		Total: cS.Count,
		Users: make([]User, 0, r.Limit),
	}
	
	err = cur.All(X(), &result.Users)
	
	if err != nil {
		log.Printf("[Warn] Failed loading users: %s\n", err)
		return nil, EUnknown
	}
	
	result.Count = uint(len(result.Users))
	
	return result, EOk
}

type AddUserQ struct {
	Name       string `json:"name" binding:"required"`
	Password   string `json:"password" binding:"required"`
	Privileged bool   `json:"privileged"`
}

func AddUser(r *AddUserQ) SErr {
	cu := C("user")
	
	e, serr := UserExist(r.Name)
	
	if serr != EOk {
		return serr
	}
	
	if e {
		log.Printf("[Info] Admin tries to create with exist account name `%s`.\n", r.Name)
		return EUserExist
	}
	
	_, err := cu.InsertOne(X(), &User{
		ID:         primitive.NewObjectID(),
		Name:       r.Name,
		Password:   PasswordHash(r.Password),
		Privileged: r.Privileged,
		Frozen:     false,
		VersionP:   0,
		VersionC:   0,
	})
	
	if err != nil {
		log.Printf("[Warn] Failed adding user `%s`: %s\n", r.Name, err)
		return EUnknown
	}
	
	return EOk
}

type RemoveUserQ struct {
	Users   []primitive.ObjectID `json:"users" binding:"required"`
	Cascade bool                 `json:"cascade"`
}

func RemoveUser(r *RemoveUserQ) SErr {
	for _, id := range r.Users {
		if id == AdminID {
			return EBadRequest
		}
	}
	
	cu := C("user")
	ci := C("image")
	
	if r.Cascade {
		_, err := ci.DeleteMany(Xd(5 * time.Second), bson.M{
			"user_id": bson.M{"$in": r.Users},
		})
		
		if err != nil {
			log.Printf("[Warn] Failed deleting images: %s\n", err)
			return EUnknown
		}
	} else {
		_, err := ci.UpdateMany(Xd(5 * time.Second),
			bson.M{"user_id": bson.M{"$in": r.Users}},
			bson.M{"$set": bson.M{"user_id": AdminID, "user_name": "admin"}},
		)
		
		if err != nil {
			log.Printf("[Warn] Failed changing owner of images: %s\n", err)
			return EUnknown
		}
	}
	
	_, err := cu.DeleteMany(X(), bson.M{
		"_id": bson.M{"$in": r.Users},
	})
	
	if err != nil {
		log.Printf("[Warn] Failed deleting users: %s\n", err)
		return EUnknown
	}
	
	return EOk
}

type SetPasswordQ struct {
	UserID   primitive.ObjectID `json:"user_id" binding:"required"`
	Password string             `json:"password" binding:"required"`
}

func SetPassword(r *SetPasswordQ) SErr {
	cu := C("user")
	
	n, err := cu.UpdateOne(X(),
		bson.M{"_id": r.UserID},
		bson.M{
			"$inc": bson.M{"version_p": 1},
			"$set": bson.M{"password": PasswordHash(r.Password)},
		})
	
	if err != nil {
		log.Printf("[Warn] Failed setting password: %s\n", err)
		return EUnknown
	}
	
	if n.MatchedCount == 0 {
		if config.Site.Debug {
			log.Println("[Info] Admin tries to set password of unknown user.")
		}
		
		return EUserNotExist
	}
	return EOk
}

type SetUserPermissionQ struct {
	UserID     primitive.ObjectID `json:"user_id" binding:"required"`
	Privileged bool               `json:"privileged"`
	Frozen     bool               `json:"frozen"`
}

func SetUserPermission(r *SetUserPermissionQ) SErr {
	cu := C("user")
	
	n, err := cu.UpdateOne(X(),
		bson.M{"_id": r.UserID},
		bson.M{
			"$inc": bson.M{"version_c": 1},
			"$set": bson.M{
				"privileged": r.Privileged,
				"frozen":     r.Frozen,
			},
		})
	
	if err != nil {
		log.Printf("[Warn] Failed setting permission: %s\n", err)
		return EUnknown
	}
	
	if n.MatchedCount == 0 {
		if config.Site.Debug {
			log.Println("[Info] Admin tries to set permission of unknown user.")
		}
		
		return EUserNotExist
	}
	
	return EOk
}

type ListInviteQ struct {
	Offset  uint   `json:"offset"`
	Limit   uint   `json:"limit" binding:"required"`
}

type ListInviteP struct {
	Total uint   `json:"total"`
	Count uint   `json:"count"`
	Codes []InviteCode `json:"codes"`
}

func ListInvite(r *ListInviteQ) (*ListInviteP, SErr) {
	ci := C("invite")
	
	n, err := ci.EstimatedDocumentCount(X())
	
	if err != nil {
		log.Printf("[Warn] Failed counting invite code: %s\n", err)
		return nil, EUnknown
	}
	
	p := &ListInviteP{}
	p.Total = uint(n)
	
	if n - int64(r.Offset) <= 0 {
		return p, EOk
	}
	
	p.Codes = make([]InviteCode, 0, r.Limit)
	
	opts := options.Find()
	opts.SetSkip(int64(r.Offset))
	opts.SetLimit(int64(r.Limit))
	
	cur, err := ci.Find(X(), bson.M{}, opts)
	
	if err == mongo.ErrNoDocuments {
		p.Count = 0
		return p, EOk
	} else if err != nil {
		log.Printf("[Warn] Failed reading invite code: %s", err)
		return nil, EUnknown
	}
	
	if err = cur.All(X(), &p.Codes); err != nil {
		log.Printf("[Warn] Failed loading invite code: %s", err)
		return nil, EUnknown
	}
	
	p.Count = uint(len(p.Codes))
	return p, EOk
}

func AddInvite(r *InviteCode) SErr {
	if r.Times < 1 {
		return EBadRequest
	}
	
	ci := C("invite")
	
	n := ci.FindOne(X(), bson.M{"code": r.Code})
	
	if n.Err() == nil {
		if config.Site.Debug {
			log.Printf("[Info] Admin tries to add existed invite code `%s`.\n", r.Code)
		}
		
		return EInviteCodeExist
	}
	
	if n.Err() != mongo.ErrNoDocuments {
		log.Printf("[Warn] Failed checking invite code `%s` exist: %s\n", r.Code, n.Err())
		return EUnknown
	}
	
	_, err := ci.InsertOne(X(), r)
	
	if err != nil {
		log.Printf("[Warn] Failed adding invite code `%s`: %s\n", r.Code, n.Err())
		return EUnknown
	}
	
	return EOk
}

func RemoveInvite(code string) SErr {
	ci := C("invite")
	
	n, err := ci.DeleteOne(X(), bson.M{"code": code})
	
	if err != nil {
		log.Printf("[Warn] Failed removing invite code `%s`: %s\n", code, err)
		return EUnknown
	}
	
	if n.DeletedCount == 0 {
		return EInviteCodeNotExist
	}
	
	return EOk
}

func SetInviteTimes(r *InviteCode) SErr {
	ci := C("invite")
	
	n, err := ci.UpdateOne(X(), bson.M{"code": r.Code}, bson.M{"$set": bson.M{"times": r.Times}})
	
	if err != nil {
		log.Printf("[Warn] Failed updating invite code available count `%s`: %s\n", r.Code, err)
		return EUnknown
	}
	
	if n.MatchedCount == 0 {
		return EInviteCodeNotExist
	}
	
	return EOk
}
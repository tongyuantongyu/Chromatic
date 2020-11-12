package main

import (
	"github.com/dgrijalva/jwt-go"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID         primitive.ObjectID `bson:"_id" json:"id"`
	Name       string             `bson:"name" json:"name"`
	Password   []byte             `bson:"password" json:"-"`
	Privileged bool               `bson:"privileged" json:"privileged"`
	Frozen     bool               `bson:"frozen" json:"frozen"`
	VersionP   uint64             `bson:"version_p" json:"-"`
	VersionC   uint64             `bson:"version_c" json:"-"`
}

type ImageFormat struct {
	Format string `bson:"format" json:"format"`
	Hash   int64  `bson:"hash" json:"hash"`
}

type Image struct {
	ID       primitive.ObjectID `bson:"_id" json:"id"`
	UserID   primitive.ObjectID `bson:"user_id" json:"user_id"`
	UserName string             `bson:"user_name" json:"user_name"`
	Storage  string             `bson:"storage" json:"-"`
	Tag      string             `bson:"tag" json:"tag"`
	Upload   primitive.DateTime `bson:"upload" json:"upload"`
	View     uint64             `bson:"view" json:"view"`
	Origins  []string           `bson:"origins" json:"origins"`
	Original bool               `bson:"original" json:"original"`
	Size     int                `bson:"size" json:"-"`
	Files    []ImageFormat      `bson:"files" json:"files,omitempty"`
}

type InviteCode struct {
	Code  string `bson:"code" json:"code" binding:"required"`
	Times uint64 `bson:"times" json:"times" binding:"required"`
}

type UserJWT struct {
	Name     string `json:"name"`
	VersionP uint64 `json:"version_p"`
	VersionC uint64 `json:"version_c"`
	jwt.StandardClaims
}

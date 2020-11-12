package main

import (
	"context"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"sync"
	"time"
)

var client *mongo.Client

func InitDB() error {
	c, err := mongo.NewClient(options.Client().ApplyURI(config.DB.MongoUri))
	if err != nil {
		return err
	}
	ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)
	err = c.Connect(ctx)
	if err != nil {
		return err
	}
	client = c
	return nil
}

var onceDB sync.Once
var db *mongo.Database

func DB() *mongo.Database {
	onceDB.Do(func() {
		db = client.Database(config.DB.DBName)
	})
	return db
}

var cols = new(sync.Map)

func C(collection string) *mongo.Collection {
	if c, exist := cols.Load(collection); exist {
		return c.(*mongo.Collection)
	} else {
		c := DB().Collection(collection)
		cols.Store(collection, c)
		return c
	}
}
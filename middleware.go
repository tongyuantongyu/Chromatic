package main

import (
	"fmt"
	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"strings"
	"time"
	
	"log"
)

func SafetyHeader() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("strict-transport-security", "max-age=31536000")
		c.Header("content-security-policy", "upgrade-insecure-requests")
	}
}

func CreateJWT(u *User) (string, error) {
	claims := UserJWT{
		Name:           u.Name,
		VersionP:       u.VersionP,
		VersionC:       u.VersionC,
		StandardClaims: jwt.StandardClaims{
			Id: u.ID.Hex(),
			IssuedAt: time.Now().Unix(),
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.Security.HMAC))
}

func JWTRetrieve() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("jwtError", EOk)
		auth := c.Request.Header.Get("Authorization")
		if auth == "" {
			c.Set("user", nil)
			c.Set("jwtError", EMissingAuthorization)
			return
		}
		
		if !strings.HasPrefix(auth, "Bearer ") {
			c.Set("user", nil)
			
			c.Set("jwtError", EBadCredential)
			return
		}
		
		jwtToken := strings.TrimPrefix(auth, "Bearer ")
		
		token, err := jwt.ParseWithClaims(jwtToken, &UserJWT{}, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			
			return []byte(config.Security.HMAC), nil
		})
		
		if err != nil {
			c.Set("user", nil)
			c.Set("jwtError", EBadCredential)
			return
		}
		
		claims, ok := token.Claims.(*UserJWT)
		
		if !ok || !token.Valid {
			c.Set("user", nil)
			c.Set("jwtError", EBadCredential)
			return
		}
		
		cu := C("user")
		n := &User{}
		
		id, err := primitive.ObjectIDFromHex(claims.Id)
		
		if err != nil {
			c.Set("user", nil)
			c.Set("jwtError", EBadCredential)
			return
		}
		
		if u := cu.FindOne(X(), bson.M{"_id": id});
			u.Err() == mongo.ErrNoDocuments {
			c.Set("user", nil)
			c.Set("jwtError", EBadCredential)
			return
		} else if u.Err() != nil {
			log.Printf("[Warn] failed finding user data of %s from jwt: %s\n", claims.Id, u.Err())
			c.Set("user", nil)
			c.Set("jwtError", EUnknown)
			return
		} else if err := u.Decode(n); err != nil {
			log.Printf("[Warn] failed loading user data of %s from jwt: %s\n", claims.Id, u.Err())
			c.Set("user", nil)
			c.Set("jwtError", EUnknown)
			return
		}
		
		if n.VersionP != claims.VersionP {
			c.Set("user", nil)
			c.Set("jwtError", ECredentialExpired)
			return
		}
		
		if n.VersionC != claims.VersionC {
			if newJWT, err := CreateJWT(n); err == nil {
				c.Header("X-Update-Authorization", newJWT)
			} else {
				log.Printf("[Warn] failed generating new jwt: %s\n", err)
			}
		}
		
		c.Set("user", n)
	}
}

func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		ui, exist := c.Get("user")
		if !exist {
			log.Println("[Warn] JWTAuth appeared without JWTRetrieve.")
			abortWithError(c, EUnknown)
			return
		} else if u, ok := ui.(*User); !ok {
			log.Println("[Warn] `user` field set to unknown value.")
			erri, exist := c.Get("jwtError")
			var err SErr
			if !exist {
				err = EUnknown
			} else {
				err = erri.(SErr)
			}
			abortWithError(c, err)
			return
		} else {
			if u.Frozen {
				abortWithError(c, EPermissionDenied)
				return
			}
		}
	}
}

func ActiveUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		ui, exist := c.Get("user")
		if !exist {
			log.Println("[Warn] Privileged appeared before jwt.")
			abortWithError(c, EUnknown)
			return
		} else if u, ok := ui.(*User); !ok {
			log.Println("[Warn] `user` field set to unknown value.")
			abortWithError(c, EUnknown)
			return
		} else {
			if u.Frozen {
				abortWithError(c, EPermissionDenied)
				return
			}
		}
	}
}

func Privileged() gin.HandlerFunc {
	return func(c *gin.Context) {
		ui, exist := c.Get("user")
		if !exist {
			log.Println("[Warn] Privileged appeared before jwt.")
			abortWithError(c, EUnknown)
			return
		} else if u, ok := ui.(*User); !ok {
			log.Println("[Warn] `user` field set to unknown value.")
			abortWithError(c, EUnknown)
			return
		} else {
			if !u.Privileged {
				abortWithError(c, EPermissionDenied)
				return
			}
		}
	}
}

func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		ui, exist := c.Get("user")
		if !exist {
			log.Println("[Warn] Privileged appeared before jwt.")
			abortWithError(c, EUnknown)
			return
		} else if u, ok := ui.(*User); !ok {
			log.Println("[Warn] `user` field set to unknown value.")
			abortWithError(c, EUnknown)
			return
		} else {
			if u.Name != "admin" {
				abortWithError(c, EPermissionDenied)
				return
			}
		}
	}
}

func AdminOrLimited() gin.HandlerFunc {
	return func(c *gin.Context) {
		ui, exist := c.Get("user")
		if !exist {
			log.Println("[Warn] Privileged appeared before jwt.")
			abortWithError(c, EUnknown)
			return
		} else if u, ok := ui.(*User); !ok {
			log.Println("[Warn] `user` field set to unknown value.")
			abortWithError(c, EUnknown)
			return
		} else {
			if u.Name == "admin" {
				c.Set("user_id", nil)
			} else {
				c.Set("user_id", &u.ID)
			}
		}
	}
}

//func fileExists(prefix string, filepath string) bool {
//	if p := strings.TrimPrefix(filepath, prefix); len(p) < len(filepath) {
//		name := path.Join(config.Site.Static, p)
//		stats, err := os.Stat(name)
//		if err != nil {
//			return false
//		}
//		if stats.IsDir() {
//			return false
//		}
//		return true
//	}
//	return false
//}
//
//func ServeStatic(prefix string) gin.HandlerFunc {
//	fs := FileServer(gin.Dir(config.Site.Static, false))
//	if prefix != "" {
//		fs = http.StripPrefix(prefix, fs)
//	}
//	return func(c *gin.Context) {
//		if fileExists(prefix, c.Request.URL.Path) {
//			fs.ServeHTTP(c.Writer, c.Request)
//			c.Abort()
//		}
//
//	}
//}
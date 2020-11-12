package main

import (
	"ImageServer/gcnotifier"
	"ImageServer/native"
	"github.com/BurntSushi/toml"
	"github.com/gin-gonic/gin"
	"io/ioutil"
	"log"
	"runtime"
)

var config Config

func init() {
	config.SetDefault()
	if c, err := ioutil.ReadFile("./config.toml"); err == nil {
		if err = toml.Unmarshal(c, &config); err != nil {
			log.Printf("Failed loading config: %s, use default settings.\n", err)
			config.SetDefault()
		} else {
			log.Println("Config loaded.")
		}
	} else {
		log.Println("No config found. use default settings.")
	}
	
	native.SetMaxSize(uint32(config.Site.MaxSize))
	//native.SetMaxThread(1)
	
	if config.Site.Thread == 0 {
		config.Site.Thread = uint64(runtime.NumCPU())
	}
	
	if runtime.NumCPU() == 1 {
		native.SetMaxThread(1)
	} else {
		native.SetMaxThread(uint32(config.Site.Thread - 1))
	}

	
	// Setup database
	if err := InitDB(); err != nil {
		log.Fatalf("Failed init database: %s", err)
	}
	
	if !config.Site.Debug {
		gin.SetMode(gin.ReleaseMode)
	}
	
	InitUser()
	InitEncoder()
	
	if err := InitCleanup(); err != nil {
		log.Fatalf("Failed cleanup: %s", err)
	}
	
	// On linux, program will continue holding a huge amount of memory used by encoding codes,
	// pressure the memory a lot. We attach malloc_trim call after each GC run to
	// reduce that usage.
	gcn := gcnotifier.New()
	go func() {
		for range gcn.AfterGC() {
			native.TrimMemory()
		}
	}()
}

func RegisterRoute(r *gin.Engine) {
	a := r.Group("/api", JWTRetrieve())
	{
		user := a.Group("/user")
		{
			user.GET("/exist/:name", userExist)
			user.GET("/get/:id", getUser)
			user.POST("/register", register)
			user.POST("/login", login)
			authed := user.Group("/", JWTAuth())
			{
				authed.POST("/changePassword", changePassword)
				authed.POST("/setAvatar", setAvatar)
				authed.GET("/resetAvatar", resetAvatar)
				admin := authed.Group("/admin", AdminOnly())
				{
					admin.POST("/setAvatar", setAvatarP)
					admin.GET("/resetAvatar/:id", resetAvatarP)
					admin.POST("/list", listUser)
					admin.POST("/add", addUser)
					admin.POST("/remove", removeUser)
					admin.POST("/password", setPassword)
					admin.POST("/permission", setUserPermission)
				}
			}
		}
		invite := a.Group("/invite", JWTAuth(), AdminOnly())
		{
			invite.POST("/list", listInvite)
			invite.POST("/add", addInvite)
			invite.GET("/remove/:code", removeInvite)
			invite.POST("/setTimes", setInviteTimes)
		}
		gallery := a.Group("/gallery")
		{
			gallery.POST("/list", listImage)
			gallery.GET("/listTags/:id", listImageTags)
			gallery.POST("/listWithTag", listImageWithTag)
			gallery.POST("/listContainsTag", listImageContainsTag)
			gallery.POST("/set", JWTAuth(), AdminOrLimited(), setImageInfo)
		}
		image := a.Group("/image")
		{
			image.GET("/get/:id", getImage)
			image.POST("/remove", JWTAuth(), AdminOrLimited(), removeImage)
			upload := a.Group("/upload", JWTAuth(), ActiveUser())
			{
				upload.POST("/simple", uploadSimple)
				advanced := upload.Group("/", Privileged())
				{
					advanced.POST("/advanced", uploadAdvanced)
					advanced.POST("/update", updateImage)
				}
			}
		}
	}
	r.GET("/image/:id", getImageFile)
	r.HEAD("/image/:id", getImageFile)
	r.GET("/avatar/:id", getAvatarFile)
	r.HEAD("/avatar/:id", getAvatarFile)
	r.GET("/preview/:id", getImagePreview)
	r.HEAD("/preview/:id", getImagePreview)
	r.POST("/preference", setFormatPreference)
	
	r.HandleMethodNotAllowed = true
	r.NoRoute(ServeStatic(""))
}

func main() {
	router := gin.Default()
	router.MaxMultipartMemory = int64(config.Site.BodySize) // 50MB
	
	RegisterRoute(router)
	
	if config.HTTPS.Cert != "" && config.HTTPS.Key != "" {
		_ = router.RunTLS(config.Site.Listen, config.HTTPS.Cert, config.HTTPS.Key)
	} else {
		_ = router.Run(config.Site.Listen)
	}
}
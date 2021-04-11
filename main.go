package main

import (
	"ImageServer/gcnotifier"
	"ImageServer/native"
	"fmt"
	"github.com/BurntSushi/toml"
	"github.com/gin-gonic/gin"
	"io"
	"io/ioutil"
	"log"
	"runtime"
	"time"
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
	
	
	if !config.Site.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	if config.Site.WriteLog {
		gin.DefaultWriter = io.MultiWriter(gin.DefaultWriter, &fileLogger{
			template: config.Site.LogFile,
		})
	}
	
	// Setup database
	if err := InitDB(); err != nil {
		log.Fatalf("Failed init database: %s", err)
	}
	
	if config.Site.ReadOnly {
		return
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
	if config.HTTPS.Promote {
		r.Use(SafetyHeader())
	}
	
	if !config.Site.ReadOnly {
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
		r.GET("/avatar/:id", getAvatarFile)
		r.HEAD("/avatar/:id", getAvatarFile)
		r.GET("/preview/:id", getImagePreview)
		r.HEAD("/preview/:id", getImagePreview)
		r.POST("/preference", setFormatPreference)
	}
	
	r.GET("/image/:id", getImageFile)
	r.HEAD("/image/:id", getImageFile)
	
	r.HandleMethodNotAllowed = true
	r.NoRoute(ServeStatic(""))
}

func main() {
	router := gin.New()
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		var statusColor, methodColor, resetColor string
		if param.IsOutputColor() {
			statusColor = param.StatusCodeColor()
			methodColor = param.MethodColor()
			resetColor = param.ResetColor()
		}

		if param.Latency > time.Minute {
			param.Latency = param.Latency - param.Latency%time.Second
		}

		ext := ""

		if extI, exist := param.Keys["Served-Ext"]; exist {
			if extS, ok := extI.(string); ok {
				ext = fmt.Sprintf("(%5s)", extS)
			}
		}

		from := ""

		if fromI, exist := param.Keys["Req-From"]; exist {
			if fromS, ok := fromI.(string); ok {
				if fromS == "" {
					fromS = "no-referer"
				}
				from = fmt.Sprintf("(from: %5s)", fromS)
			}
		}

		return fmt.Sprintf("[LOG] %v |%s %3d %s| %13v | %15s |%s %-7s %s%s %s %s %#v\n%s",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			statusColor, param.StatusCode, resetColor,
			param.Latency,
			param.ClientIP,
			methodColor, param.Method, resetColor,
			param.Path,
			ext,
			from,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	}), gin.Recovery())

	router.MaxMultipartMemory = int64(config.Site.BodySize) // 50MB
	
	RegisterRoute(router)
	
	if config.HTTPS.Cert != "" && config.HTTPS.Key != "" {
		_ = router.RunTLS(config.Site.Listen, config.HTTPS.Cert, config.HTTPS.Key)
	} else {
		_ = router.Run(config.Site.Listen)
	}
}
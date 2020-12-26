package main

type ConfigSite struct {
	Listen string `toml:"listen"`
	Host string `toml:"host"`
	Storage string `toml:"storage"`
	Static string `toml:"static"`
	
	BodySize uint64 `toml:"body_size"`
	MaxList uint64 `toml:"max_list"`
	AvatarSize uint64 `toml:"avatar_size"`
	PreviewSize uint64 `toml:"preview_size"`
	MaxSize uint64 `toml:"max_size"`
	AvifThreshold uint64 `toml:"avif_threshold"`
	
	Debug bool `toml:"debug"`
	Thread uint64 `toml:"thread"`

	WriteLog bool `toml:"write_log"`
	LogFile string `toml:"log_file"`
}

type ConfigDatabase struct {
	MongoUri string `toml:"mongo_uri"`
	DBName string `toml:"db_name"`
}

type ConfigSecurity struct {
	Salt string `toml:"salt"`
	HMAC string `toml:"hmac"`
	AdminPassword string `toml:"admin_password"`
	RecaptchaKey string `toml:"recaptcha_key"`
}

type ConfigHTTPS struct {
	Cert string `toml:"cert"`
	Key string `toml:"key"`
}

type Config struct {
	Site ConfigSite `toml:"site"`
	DB ConfigDatabase `toml:"database"`
	Security ConfigSecurity `toml:"security"`
	HTTPS ConfigHTTPS `toml:"https"`
}

func (c *Config) SetDefault() {
	c.Site.Listen = ":8080"
	c.Site.Host = "localhost"
	c.Site.Storage = "./storage"
	c.Site.Static = "./static"
	
	c.Site.BodySize = 52428800
	c.Site.MaxList = 100
	c.Site.AvatarSize = 256
	c.Site.PreviewSize = 256
	c.Site.MaxSize = 8192
	c.Site.AvifThreshold = 100

	c.Site.WriteLog = false
	
	c.DB.MongoUri = "mongodb://localhost:27017"
	c.DB.DBName = "image"
	
	c.Security.Salt = "salt"
	c.Security.HMAC = "hmac"
	c.Security.AdminPassword = "adminadmin"
	c.Security.RecaptchaKey = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
	
	c.HTTPS.Cert = ""
	c.HTTPS.Key = ""
}
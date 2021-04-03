package main

import (
	"context"
	"fmt"
	"golang.org/x/crypto/scrypt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"time"
)

func GetSquare(w, h uint32) (x, y, wo, ho uint32) {
	if w == h {
		return 0, 0, w, h
	} else if w > h {
		return (w - h) / 2, 0, h, h
	} else {
		return 0, (h - w) / 2, w, w
	}
}

// X return a context cancel after one second.
// This is an convenient method for mongodb operations
func X() context.Context {
	var ctx context.Context
	if !config.Site.Debug {
		ctx, _ = context.WithTimeout(context.Background(), time.Second)
	} else {
		// allow more time when debugging
		ctx, _ = context.WithTimeout(context.Background(), time.Minute)
	}
	
	return ctx
}

// Xd return a context cancel after given duration.
// This is an convenient method for mongodb operations
func Xd(duration time.Duration) context.Context {
	ctx, _ := context.WithTimeout(context.Background(), duration)
	return ctx
}

func PasswordHash(password string) []byte {
	h, _ := scrypt.Key([]byte(password), []byte(config.Security.Salt), 32768, 8, 1, 32)
	return h
}

func PasswordVerify(password string) bool {
	if len(password) < 8 {
		return false
	}
	
	var n, a, A, o bool
	
	for _, c := range []byte(password) {
		if c >= '0' && c <= '9' {
			n = true
		} else if c >= 'a' && c <= 'z' {
			a = true
		} else if c >= 'A' && c <= 'Z' {
			A = true
		} else {
			o = true
		}
	}

	count := 0
	if n {
		count++
	}

	if a {
		count++
	}

	if A {
		count++
	}

	if o {
		count++
	}
	
	return count >= 3
}

func RecaptchaVerify(response string) SErr {
	resp, err := http.PostForm("https://recaptcha.net/recaptcha/api/siteverify",
		url.Values{
			"secret":   {config.Security.RecaptchaKey},
			"response": {response}})
	if err != nil {
		return EUnknown
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return EUnknown
	}
	var result struct{ Success bool `json:"success"` }
	if json.Unmarshal(body, &result) != nil {
		return EUnknown
	}
	if !result.Success {
		return EBadRecaptcha
	} else {
		return EOk
	}
}

type fileLogger struct {
	template string
	year int
	month time.Month
	curFile *os.File
}

func (l *fileLogger) refresh() (err error) {
	year, month, _ := time.Now().Date()
	if l.year == year && l.month == month {
		return
	}
	
	l.year = year
	l.month = month
	
	if l.curFile != nil {
		if err = l.curFile.Close(); err != nil {
			return
		}
	}
	
	l.curFile, err = os.OpenFile(fmt.Sprintf(l.template, l.year, l.month), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	return
}

func (l *fileLogger) Write(p []byte) (n int, err error) {
	if err := l.refresh(); err != nil {
		return 0, err
	}
	
	return l.curFile.Write(p)
}

func (l *fileLogger) Close() error {
	return l.curFile.Close()
}
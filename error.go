package main

import (
	"errors"
	"fmt"
	"strconv"
)

type SErr int

const (
	EOk = SErr(iota)
	EWeakPassword
	EUserExist
	EInvalidInviteCode
	EBadCredential
	EUserNotExist
	EInviteCodeExist
	EInviteCodeNotExist
	EBadRequest
	EImageNotExist
	EBadImage
	EEncodeFailed
	EMissingOriginal
	EMissingAuthorization
	ECredentialExpired
	EPermissionDenied
	EBadRecaptcha
	
	EUnknown = SErr(9999)
)

func (err SErr) Error() string {
	return fmt.Sprintf("operation error: %d", int(err))
}

func (err SErr) MarshalJSON() ([]byte, error) {
	return json.Marshal(fmt.Sprintf("%04d", int(err)))
}

func (err *SErr) UnmarshalJSON(b []byte) error {
	if len(b) != 4 {
		return errors.New("bad Error code: invalid length")
	}
	
	i, e := strconv.Atoi(string(b))
	
	if e != nil {
		return fmt.Errorf("bad Error code: %s", e)
	}
	
	*err = SErr(i)
	return nil
}

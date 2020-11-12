package main

import (
	"net"
	"strings"
	"unicode/utf8"
)

// toLowerCaseASCII returns a lower-case version of in. See RFC 6125 6.4.1. We use
// an explicitly ASCII function to avoid any sharp corners resulting from
// performing Unicode operations on DNS labels.
func toLowerCaseASCII(in string) string {
	// If the string is already lower-case then there's nothing to do.
	isAlreadyLowerCase := true
	for _, c := range in {
		if c == utf8.RuneError {
			// If we get a UTF-8 error then there might be
			// upper-case ASCII bytes in the invalid sequence.
			isAlreadyLowerCase = false
			break
		}
		if 'A' <= c && c <= 'Z' {
			isAlreadyLowerCase = false
			break
		}
	}
	
	if isAlreadyLowerCase {
		return in
	}
	
	out := []byte(in)
	for i, c := range out {
		if 'A' <= c && c <= 'Z' {
			out[i] += 'a' - 'A'
		}
	}
	return string(out)
}

func standardizeHostname(host string) (clean string, valid bool) {
	if len(host) == 0 || host == "*" || host == " " {
		return host, true
	}
	
	host = strings.TrimSuffix(toLowerCaseASCII(host), ".")
	
	for i, part := range strings.Split(host, ".") {
		if part == "" {
			// Empty label.
			return "", false
		}
		if i == 0 && part == "*" {
			// Only allow full left-most wildcards, as those are the only ones
			// we match, and matching literal '*' characters is probably never
			// the expected behavior.
			continue
		}
		for j, c := range part {
			if 'a' <= c && c <= 'z' {
				continue
			}
			if '0' <= c && c <= '9' {
				continue
			}
			if c == '-' && j != 0 {
				continue
			}
			if c == '_' || c == ':' {
				// Not valid characters in hostnames, but commonly
				// found in deployments outside the WebPKI.
				continue
			}
			return "", false
		}
	}
	
	return host, true
}

// validHostname reports whether host is a valid hostname that can be matched or
// matched against according to RFC 6125 2.2, with some leniency to accommodate
// legacy values.
func validHostname(host string) bool {
	if len(host) == 0 || host == "*" || host == " " {
		return true
	}
	
	host = strings.TrimSuffix(host, ".")
	
	for i, part := range strings.Split(host, ".") {
		if part == "" {
			// Empty label.
			return false
		}
		if i == 0 && part == "*" {
			// Only allow full left-most wildcards, as those are the only ones
			// we match, and matching literal '*' characters is probably never
			// the expected behavior.
			continue
		}
		for j, c := range part {
			if 'a' <= c && c <= 'z' {
				continue
			}
			if '0' <= c && c <= '9' {
				continue
			}
			if 'A' <= c && c <= 'Z' {
				continue
			}
			if c == '-' && j != 0 {
				continue
			}
			if c == '_' || c == ':' {
				// Not valid characters in hostnames, but commonly
				// found in deployments outside the WebPKI.
				continue
			}
			return false
		}
	}
	
	return true
}

func matchHostnames(pattern, host string) bool {
	host = strings.TrimSuffix(host, ".")
	pattern = strings.TrimSuffix(pattern, ".")
	
	if len(pattern) == 0 || len(host) == 0 {
		return false
	}
	
	if pattern[0] == '*' {
		return strings.HasSuffix(host, pattern[1:])
	} else {
		return host == pattern
	}
}

func CleanOrigins(r string) (result []string) {
	origins := strings.Split(r, ",")
	clean := make(map[string]struct{})
	
	for _, o := range origins {
		if _, exist := clean[o]; !exist {
			clean[o] = struct{}{}
			result = append(result, o)
		}
		
		if len(result) == 100 {
			return
		}
	}
	return
}

func verifyHostname(host, pattern string) bool {
	if pattern == "" {
		return false
	} else if pattern == "*" {
		return true
	} else if host == "" && pattern == " " {
		return true
	}
	
	// IP addresses may be written in [ ].
	candidateIP := host
	if len(host) >= 3 && host[0] == '[' && host[len(host)-1] == ']' {
		candidateIP = host[1 : len(host)-1]
	}
	if ip := net.ParseIP(candidateIP); ip != nil {
		// We only match IP addresses against IP SANs.
		// See RFC 6125, Appendix B.2.
		if patternIp := net.ParseIP(pattern); patternIp != nil {
			return ip.Equal(patternIp)
		} else {
			return false
		}
	}
	
	return matchHostnames(pattern, toLowerCaseASCII(host))
}

func VerifyHostname(host string, origins []string) bool {
	for _, o := range origins {
		if verifyHostname(host, o) {
			return true
		}
	}
	
	return false
}
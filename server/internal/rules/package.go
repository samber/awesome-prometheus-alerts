package rules

import "github.com/samber/do/v2"

// Package registers the rule Validator.
var Package = do.Package(
	do.Lazy(func(do.Injector) (*Validator, error) {
		return NewValidator(), nil
	}),
)

package config

import "github.com/samber/do/v2"

// Package registers the Config loaded from the process environment.
var Package = do.Package(
	do.Lazy(func(do.Injector) (*Config, error) {
		return Load()
	}),
)

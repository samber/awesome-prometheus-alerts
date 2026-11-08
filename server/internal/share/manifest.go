package share

import "encoding/json"

func encodeManifest(manifest Manifest) ([]byte, error) {
	body, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return nil, err
	}
	return append(body, '\n'), nil
}

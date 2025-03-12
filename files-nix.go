// exiftool_darwin.go
//go:build darwin || linux

package main

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed assets/nix/*
var exiftoolDarwinFS embed.FS

func listExiftoolFiles() {
	exiftoolFilesFS, err := fs.Sub(exiftoolDarwinFS, "assets/exiftool_files")
	if err != nil {
		fmt.Printf("Failed to get exiftool_files sub FS: %v\n", err)
		return
	}

	err = fs.WalkDir(exiftoolFilesFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		fmt.Println(path)
		return nil
	})
	if err != nil {
		fmt.Printf("Failed to list exiftool_files: %v\n", err)
	}
}

func extractPlatformSpecificExiftool() (string, error) {
	exiftoolName := "exiftool"
	exiftoolFilesDir := "assets/nix"

	tempDir, err := os.MkdirTemp("", "exiftool")
	if err != nil {
		return "", fmt.Errorf("failed to create temporary directory: %v", err)
	}

	// Remove defer os.RemoveAll(tempDir) temporarily for debugging
	fmt.Printf("Created temp dir: %s\n", tempDir)

	exiftoolFilesFS, err := fs.Sub(exiftoolDarwinFS, exiftoolFilesDir)
	if err != nil {
		return "", fmt.Errorf("failed to get exiftool_files sub FS: %v", err)
	}

	// List all files in the embedded filesystem for debugging
	entries, _ := fs.ReadDir(exiftoolFilesFS, ".")
	fmt.Println("Files in embedded FS:")
	for _, entry := range entries {
		fmt.Printf("- %s\n", entry.Name())
	}

	err = fs.WalkDir(exiftoolFilesFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() {
			return nil
		}

		// Extract directly to tempDir if it's the exiftool binary
		var destPath string
		if filepath.Base(path) == exiftoolName {
			destPath = filepath.Join(tempDir, exiftoolName)
		} else {
			destPath = filepath.Join(tempDir, path)
		}

		fmt.Printf("Extracting %s to %s\n", path, destPath)

		destDir := filepath.Dir(destPath)
		if _, err := os.Stat(destDir); os.IsNotExist(err) {
			err = os.MkdirAll(destDir, 0755)
			if err != nil {
				return fmt.Errorf("failed to create directory %s: %v", destDir, err)
			}
		}

		fileData, err := fs.ReadFile(exiftoolFilesFS, path)
		if err != nil {
			return fmt.Errorf("failed to read embedded file %s: %v", path, err)
		}

		err = os.WriteFile(destPath, fileData, 0644)
		if err != nil {
			return fmt.Errorf("failed to write file %s: %v", destPath, err)
		}

		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to extract exiftool_files: %v", err)
	}

	exiftoolPath := filepath.Join(tempDir, exiftoolName)
	err = os.Chmod(exiftoolPath, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to make exiftool executable: %v", err)
	}

	// Verify the file exists
	if _, err := os.Stat(exiftoolPath); os.IsNotExist(err) {
		return "", fmt.Errorf("exiftool binary not found at %s", exiftoolPath)
	}

	return exiftoolPath, nil
}

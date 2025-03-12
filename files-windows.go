// exiftool_windows.go
//go:build windows

package main

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed assets/windows/*
var exiftoolWindowsFS embed.FS

func listExiftoolFiles() {
	fmt.Println("Listing embedded files:")
	err := fs.WalkDir(exiftoolWindowsFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		fmt.Printf("Found embedded file: %s\n", path)
		return nil
	})
	if err != nil {
		fmt.Printf("Failed to list exiftool_files: %v\n", err)
	}
}

func extractPlatformSpecificExiftool() (string, error) {
	exiftoolName := "ExifTool.exe"
	exiftoolFilesDir := "assets/windows" // Use forward slashes for embedded filesystem

	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "exiftool-*")
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %v", err)
	}

	exiftoolPath := filepath.Join(tempDir, filepath.FromSlash(exiftoolFilesDir), exiftoolName)

	exiftoolFilesFS, err := fs.Sub(exiftoolWindowsFS, exiftoolFilesDir)
	if err != nil {
		return "", fmt.Errorf("failed to get exiftool_files sub FS: %v", err)
	}

	err = fs.WalkDir(exiftoolFilesFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			fmt.Printf("Error walking through directory: %v\n", err)
			return err
		}

		if d.IsDir() {
			return nil
		}

		destPath := filepath.Join(tempDir, filepath.FromSlash(exiftoolFilesDir), filepath.FromSlash(path))
		destDir := filepath.Dir(destPath)

		if _, err := os.Stat(destDir); os.IsNotExist(err) {
			err = os.MkdirAll(destDir, 0755)
			if err != nil {
				fmt.Printf("Failed to create directory: %v\n", err)
				return err
			}
		}

		fileData, err := fs.ReadFile(exiftoolFilesFS, path)
		if err != nil {
			fmt.Printf("Failed to read file: %v\n", err)
			return err
		}

		err = os.WriteFile(destPath, fileData, 0644)
		if err != nil {
			fmt.Printf("Failed to write file: %v\n", err)
			return err
		}

		return nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to extract exiftool_files: %v", err)
	}

	err = os.Chmod(exiftoolPath, 0755)
	if err != nil {
		return "", fmt.Errorf("failed to make exiftool executable: %v", err)
	}

	return exiftoolPath, nil
}

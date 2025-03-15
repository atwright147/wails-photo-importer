package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/adrg/xdg"
	"github.com/cespare/xxhash"
	"github.com/wailsapp/mimetype"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var exiftool_path string

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	exiftoolPath, err := extractPlatformSpecificExiftool()
	if err != nil {
		log.Fatalf("Failed to extract exiftool: %v", err)
	}

	exiftool_path = exiftoolPath
}

func (a *App) shutdown(ctx context.Context) {
	// Clean up the extracted exiftool
	if exiftool_path != "" {
		os.Remove(exiftool_path)
	}
}

var (
	allowedExtensions = []string{
		"3fr", "ari", "arw", "srf", "sr2", "bay", "braw", "cri", "crw", "cr2", "cr3",
		"cap", "iiq", "eip", "dcs", "dcr", "drf", "k25", "kdc", "dng", "erf", "fff",
		"gpr", "jxs", "mef", "mdc", "mos", "mrw", "nef", "nrw", "orf", "pef", "ptx",
		"pxn", "R3D", "raf", "raw", "rw2", "raw", "rwl", "dng", "rwz", "srw", "tco", "x3f",
	}
)

type FileInfo struct {
	Path     string `json:"path"`
	IsFile   bool   `json:"is_file"`
	Size     int64  `json:"size"`
	MimeType string `json:"mime_type"`
	Filename string `json:"filename"`
}

type ThumbnailResponse struct {
	ThumbnailPath string `json:"thumbnail_path"`
	OriginalPath  string `json:"original_path"`
	Hash          string `json:"hash"`
}

func (a *App) ListFiles(drivePath string) ([]FileInfo, error) {
	var files []FileInfo

	err := filepath.Walk(drivePath, func(path string, info os.FileInfo, err error) error {
		// Skip hidden files and directories
		if strings.HasPrefix(filepath.Base(path), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Filter for allowed file extensions
		if !info.IsDir() && isAllowedExtension(path) {
			mime, err := mimetype.DetectFile(path)
			if err != nil {
				runtime.LogErrorf(a.ctx, "error detecting mime type for %q: %v\n", path, err)
			}

			files = append(files, FileInfo{
				Path:     path,
				IsFile:   true,
				Size:     info.Size(),
				MimeType: mime.String(),
				Filename: filepath.Base(path),
			})
		}

		return nil
	})

	runtime.LogInfo(a.ctx, fmt.Sprintf("Total files found: %d", len(files)))

	return files, err
}

func isAllowedExtension(filePath string) bool {
	ext := filepath.Ext(filePath)
	if ext == "" {
		return false
	}
	ext = strings.ToLower(ext[1:])
	for _, allowedExt := range allowedExtensions {
		if ext == allowedExt {
			return true
		}
	}
	return false
}

func formatDateFolder(shotDate string, formatArg string) string {
	date, err := time.Parse("2006-01-02", shotDate)
	if err != nil {
		return shotDate
	}

	switch strings.ToLower(formatArg) {
	case "custom":
		return ""
	case "yyyymmdd":
		return date.Format("20060102")
	case "yymmdd":
		return date.Format("060102")
	case "ddmmyy":
		return date.Format("021206")
	case "ddmm":
		return date.Format("0102")
	case "yyyyddmmm":
		return date.Format("200601January")
	case "ddmmmyyyy":
		return date.Format("02January2006")
	default:
		return date.Format("20060102")
	}
}

func (a *App) GetShotDate(filePath string) (string, error) {
	cmd := exec.Command("exiftool", "-DateTimeOriginal", "-s3", filePath)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to execute exiftool: %v", err)
	}

	dateStr := strings.TrimSpace(string(output))
	re := regexp.MustCompile(`(\d{4}):(\d{2}):(\d{2})`)
	matches := re.FindStringSubmatch(dateStr)

	if len(matches) == 4 {
		return fmt.Sprintf("%s-%s-%s", matches[1], matches[2], matches[3]), nil
	}

	return "", fmt.Errorf("failed to extract shot date")
}

func (a *App) CopyOrConvert(sources []string, destination string, dateFormat string, useDNGConverter bool, deleteOriginal bool, args string) error {
	for _, source := range sources {
		shotDate, err := a.GetShotDate(source)
		if err != nil {
			return err
		}

		destDir := filepath.Join(destination, formatDateFolder(shotDate, dateFormat))
		err = os.MkdirAll(destDir, 0755)
		if err != nil {
			return fmt.Errorf("failed to create destination directory: %v", err)
		}

		if useDNGConverter {
			cmd := exec.Command("/Applications/Adobe DNG Converter.app/Contents/MacOS/Adobe DNG Converter",
				"-mp", "-d", destDir, source)

			// Add additional arguments if provided
			if args != "" {
				cmd.Args = append(cmd.Args, strings.Split(args, " ")...)
			}

			output, err := cmd.CombinedOutput()
			if err != nil {
				return fmt.Errorf("DNG Converter failed: %v, command: %s, output: %s", err, cmd.String(), string(output))
			}
		} else {
			// Copy the file
			filename := filepath.Base(source)
			destPath := filepath.Join(destDir, filename)

			err = copyFile(source, destPath)
			if err != nil {
				return fmt.Errorf("failed to copy file: %v", err)
			}
		}

		// Delete original if requested
		if deleteOriginal {
			if err := os.Remove(source); err != nil {
				return fmt.Errorf("failed to delete original file: %v", err)
			}
		}
	}

	return nil
}

func copyFile(src, dst string) error {
	input, err := os.ReadFile(src)
	if err != nil {
		return err
	}

	return os.WriteFile(dst, input, 0644)
}

func (a *App) ExtractThumbnail(path string) (ThumbnailResponse, error) {
	thumbnailDir := xdg.CacheHome
	thumbnailDir = filepath.Join(thumbnailDir, "PhotoImporter", "thumbnails")

	// Compute file hash
	hash, err := hashFile(path)
	if err != nil {
		return ThumbnailResponse{}, err
	}

	// Create thumbnail filename
	originalFilename := filepath.Base(path)
	filenameWithoutExt := strings.TrimSuffix(originalFilename, filepath.Ext(originalFilename))
	thumbnailPath := filepath.Join(thumbnailDir, fmt.Sprintf("%s_%s.jpg", filenameWithoutExt, hash))

	// Check if thumbnail exists
	if _, err := os.Stat(thumbnailPath); err == nil {
		runtime.LogErrorf(a.ctx, "thumbnail for %q, with hash %q already exists at %q", path, hash, thumbnailPath)

		return ThumbnailResponse{
			ThumbnailPath: thumbnailPath,
			OriginalPath:  path,
			Hash:          hash,
		}, nil
	}

	// Extract thumbnail using exiftool
	cmd := exec.Command(exiftool_path,
		"-thumbnailimage",
		"-b",
		"-w",
		filepath.Join(thumbnailDir, "%f_"+hash+".jpg"),
		path)

	output, err := cmd.CombinedOutput()
	if err != nil {
		runtime.LogErrorf(a.ctx, "exiftool failed: %v, output: %s", err, string(output))
	}

	return ThumbnailResponse{
		ThumbnailPath: thumbnailPath,
		OriginalPath:  path,
		Hash:          hash,
	}, nil
}

func hashFile(filepath string) (string, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	h := xxhash.New()
	buf := make([]byte, 32*1024) // 32KB buffer
	for {
		n, err := file.Read(buf)
		if err != nil && err != io.EOF {
			return "", err
		}
		if n == 0 {
			break
		}
		if _, err := h.Write(buf[:n]); err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("%x", h.Sum(nil)), nil
}

func (a *App) IsDNGConverterAvailable() bool {
	// FIXME: handle Windows too (can't do this in Linux)
	_, err := os.Stat("/Applications/Adobe DNG Converter.app")
	return err == nil
}

func (a *App) GetEnv() runtime.EnvironmentInfo {
	return runtime.Environment(a.ctx)
}

func (a *App) OpenDirectoryDialog(path string) (string, error) {
	// Create dialog options
	options := runtime.OpenDialogOptions{
		Title:            "Select Folder",
		DefaultDirectory: path,
	}

	// Open the directory dialog
	selectedPath, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if err != nil {
		return "", err
	}

	return selectedPath, nil
}

func (a *App) PictureDir() string {
	return xdg.UserDirs.Pictures
}

func (a *App) GetImageFromFolder(path string) (string, error) {
	thumbnailDir := filepath.Join(xdg.CacheHome, "PhotoImporter", "thumbnails")

	// Check that the path begins with the thumbnail directory
	if !strings.HasPrefix(path, thumbnailDir) {
		return "", fmt.Errorf("path %q is not located in the thumbnail directory %q", path, thumbnailDir)
	}

	// Read the image file from the specific folder
	imageData, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	// Convert to base64 data uri
	return "data:image/jpeg;base64," + base64.StdEncoding.EncodeToString(imageData), nil
}

func (a *App) selectAll() {
	runtime.EventsEmit(a.ctx, "select-all")
	runtime.LogDebug(a.ctx, "SelectAll event emitted")
}

func (a *App) selectNone() {
	runtime.EventsEmit(a.ctx, "deselect-all")
	runtime.LogDebug(a.ctx, "DeselectAll event emitted")
}

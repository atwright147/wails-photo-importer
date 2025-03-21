package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	wailsconfigstore "github.com/AndreiTelteu/wails-configstore"
	"github.com/adrg/xdg"
	"github.com/cespare/xxhash"
	"github.com/wailsapp/mimetype"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var exiftool_path string

// App struct
type App struct {
	ctx         context.Context
	configStore *wailsconfigstore.ConfigStore
}

// NewApp creates a new App application struct
func NewApp() *App {
	configStore, err := wailsconfigstore.NewConfigStore("PhotoImporter")

	if err != nil {
		log.Fatalf("could not initialize the config store: %v\n", err)
	}

	return &App{
		configStore: configStore,
	}
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

type Config struct {
	SourceDisk              string `json:"sourceDisk"`
	Location                string `json:"location"`
	CreateSubFoldersPattern string `json:"createSubFoldersPattern"`
	CustomSubFolderName     string `json:"customSubFolderName"`
	ConvertToDng            bool   `json:"convertToDng"`
	DeleteOriginal          bool   `json:"deleteOriginal"`
	JpegPreviewSize         string `json:"jpegPreviewSize"`
	CompressedLossless      bool   `json:"compressedLossless"`
	ImageConversionMethod   string `json:"imageConversionMethod"`
	EmbedOriginalRawFile    bool   `json:"embedOriginalRawFile"`
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
	cmd := exec.Command(exiftool_path, "-DateTimeOriginal", "-s3", filePath)
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

func (a *App) GetDngArgs() []string {
	configState := a.GetConfig()

	var dngArgs []string

	switch configState.JpegPreviewSize {
	case "fullSize":
		dngArgs = append(dngArgs, "-p2")

	case "medium":
		dngArgs = append(dngArgs, "-p1")

	default:
		dngArgs = append(dngArgs, "-p0")
	}

	if configState.CompressedLossless {
		dngArgs = append(dngArgs, "-c")
	} else {
		dngArgs = append(dngArgs, "-u")
	}

	if configState.ImageConversionMethod == "linear" {
		dngArgs = append(dngArgs, "-l")
	}

	if configState.EmbedOriginalRawFile {
		dngArgs = append(dngArgs, "-e")
	}

	return dngArgs
}

// TODO: rename to import
// TODO: fetch all args from the settings file
func (a *App) CopyOrConvert(files []string) error {
	configState := a.GetConfig()
	runtime.LogInfof(a.ctx, "Starting import of %d files to %s", len(files), configState.Location)

	dngArgs := a.GetDngArgs()

	for _, file := range files {
		runtime.LogDebugf(a.ctx, "Processing file: %s", file)

		destDir := configState.Location

		if configState.CreateSubFoldersPattern != "none" && configState.CreateSubFoldersPattern != "custom" {
			shotDate, err := a.GetShotDate(file)
			if err != nil {
				runtime.LogErrorf(a.ctx, "Failed to get shot date for %s: %v", file, err)
				return err
			}

			destDir = filepath.Join(configState.Location, formatDateFolder(shotDate, configState.CreateSubFoldersPattern))
			err = os.MkdirAll(destDir, 0755)
			if err != nil {
				runtime.LogErrorf(a.ctx, "Failed to create directory %s: %v", destDir, err)
				return fmt.Errorf("failed to create destination directory: %v", err)
			}
		}

		runtime.LogInfo(a.ctx, "CreateSubFoldersPattern: "+configState.CreateSubFoldersPattern)
		runtime.LogInfo(a.ctx, "CustomSubFolderName: "+configState.CustomSubFolderName)

		if configState.CreateSubFoldersPattern == "custom" && configState.CustomSubFolderName != "" {
			destDir = filepath.Join(configState.Location, configState.CustomSubFolderName)
			runtime.LogInfo(a.ctx, "Using custom folder name: "+configState.CustomSubFolderName)
			err := os.MkdirAll(destDir, 0755)
			if err != nil {
				runtime.LogErrorf(a.ctx, "Failed to create directory %s: %v", destDir, err)
				return fmt.Errorf("failed to create destination directory: %v", err)
			}
		}

		if configState.ConvertToDng {
			cmd := exec.Command("/Applications/Adobe DNG Converter.app/Contents/MacOS/Adobe DNG Converter",
				"-mp", "-d", destDir, file)

			if len(dngArgs) > 0 {
				runtime.LogDebugf(a.ctx, "DNG arguments: %v", dngArgs)
				cmd.Args = append(cmd.Args, dngArgs...)
			}

			runtime.LogDebugf(a.ctx, "Converting to DNG: %s", cmd.String())
			output, err := cmd.CombinedOutput()
			if err != nil {
				runtime.LogErrorf(a.ctx, "DNG conversion failed for %s: %v", file, err)
				return fmt.Errorf("DNG Converter failed: %v, command: %s, output: %s", err, cmd.String(), string(output))
			}
			runtime.LogDebugf(a.ctx, "DNG conversion completed for: %s", file)
		} else {
			filename := filepath.Base(file)
			destPath := filepath.Join(destDir, filename)

			runtime.LogDebugf(a.ctx, "Copying file to: %s", destPath)
			err := copyFile(file, destPath)
			if err != nil {
				runtime.LogErrorf(a.ctx, "Failed to copy %s: %v", file, err)
				return fmt.Errorf("failed to copy file: %v", err)
			}
		}

		if configState.DeleteOriginal {
			runtime.LogDebugf(a.ctx, "Deleting original file: %s", file)
			if err := os.Remove(file); err != nil {
				runtime.LogErrorf(a.ctx, "Failed to delete original file %s: %v", file, err)
				return fmt.Errorf("failed to delete original file: %v", err)
			}
		}
	}

	runtime.LogInfof(a.ctx, "Successfully processed %d files", len(files))
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

func (a *App) invert() {
	runtime.EventsEmit(a.ctx, "invert")
	runtime.LogDebug(a.ctx, "Invert selection event emitted")
}

func (a *App) importSelected() {
	runtime.EventsEmit(a.ctx, "import-selected")
	runtime.LogDebug(a.ctx, "Import event emitted")
}

func (a *App) GetConfig() *Config {
	data, err := a.configStore.Get(CONFIG_STORE_FILENAME, "")
	if err != nil {
		fmt.Println("could not read the config file:", err)
		return nil
	}

	var configState Config
	err = json.Unmarshal([]byte(data), &configState)
	if err != nil {
		fmt.Println("could not parse config data:", err)
		return nil
	}

	return &configState
}

func (a *App) ClearCache() error {
	thumbnailDir := xdg.CacheHome
	thumbnailDir = filepath.Join(thumbnailDir, "PhotoImporter", "thumbnails")

	runtime.LogDebugf(a.ctx, "Clear cache: %s", thumbnailDir)

	err := os.RemoveAll(thumbnailDir)
	if err != nil {
		runtime.LogDebugf(a.ctx, "Clear cache error: %v", err)
		return err
	}

	return nil
}

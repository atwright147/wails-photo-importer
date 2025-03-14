package main

import (
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	wailsconfigstore "github.com/AndreiTelteu/wails-configstore"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

const APP_NAME = "Photo Importer"

func main() {
	// Create an instance of the app structure
	app := NewApp()

	configStore, err := wailsconfigstore.NewConfigStore("PhotoImporter")
	if err != nil {
		fmt.Printf("could not initialize the config store: %v\n", err)
		return
	}

	// Create application with options
	err = wails.Run(&options.App{
		Title:  "Photo Importer",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
			configStore,
		},
		Mac: &mac.Options{
			About: &mac.AboutInfo{
				Title:   APP_NAME,
				Message: "A modern photo importer application.",
				Icon:    icon,
			},
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

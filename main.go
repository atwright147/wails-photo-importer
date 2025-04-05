package main

import (
	"embed"
	"fmt"
	"runtime"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	wailsconfigstore "github.com/AndreiTelteu/wails-configstore"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	// Create an instance of the app structure
	app := NewApp()

	configStore, err := wailsconfigstore.NewConfigStore("PhotoImporter")
	if err != nil {
		fmt.Printf("could not initialize the config store: %v\n", err)
		return
	}

	isMacOS := runtime.GOOS == "darwin"

	customMenu := menu.NewMenu()

	fileMenu := customMenu.AddSubmenu("File")
	fileMenu.AddText("Import", keys.CmdOrCtrl("i"), func(_ *menu.CallbackData) {
		app.importSelected()
	})
	fileMenu.AddText("Clear Cache", keys.CmdOrCtrl("c"), func(_ *menu.CallbackData) {
		app.ClearCache()
	})

	// customMenu.Append(menu.EditMenu())

	selectMenu := customMenu.AddSubmenu("Select")
	selectMenu.AddText("Select All", keys.CmdOrCtrl("a"), func(_ *menu.CallbackData) {
		app.selectAll()
	})
	selectMenu.AddText("Select None", keys.CmdOrCtrl("d"), func(_ *menu.CallbackData) {
		app.selectNone()
	})
	selectMenu.AddText("Invert", keys.CmdOrCtrl("i"), func(_ *menu.CallbackData) {
		app.invert()
	})
	customMenu.Append(menu.WindowMenu())

	if isMacOS {
		customMenu.Prepend(menu.AppMenu())
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
		Menu:             customMenu,
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

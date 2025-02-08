package main

import (
	"fmt"
	"strings"

	"github.com/jaypipes/ghw"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type DiskInfo struct {
	Label      string
	Model      string
	Size       uint64
	MountPoint string
}

func (a *App) GetDiskInfo() []DiskInfo {
	env := runtime.Environment(a.ctx)

	block, err := ghw.Block()
	if err != nil {
		fmt.Printf("Error getting block storage info: %v", err)
		return nil
	}

	var diskInfos []DiskInfo

	for _, disk := range block.Disks {
		if disk.IsRemovable {
			for _, partition := range disk.Partitions {
				var label string
				var model string

				if partition.FilesystemLabel != "" {
					label = strings.TrimSpace(partition.FilesystemLabel)
				}
				if label == "" && partition.Label != "" {
					label = strings.TrimSpace(partition.Label)
				}
				if label == "" && disk.Model != "" {
					label = strings.TrimSpace(disk.Model)
				}
				if label == "" {
					label = "Untitled"
				}

				if disk.Model != "" {
					model = disk.Model
				}
				if model == "" {
					model = "Unknown"
				}

				diskInfos = append(diskInfos, DiskInfo{
					Label:      label,
					Model:      model,
					Size:       partition.SizeBytes,
					MountPoint: partition.MountPoint,
				})
			}
		}

		if env.BuildType == "dev" {
			// In development mode, also add the test disk
			for _, partition := range disk.Partitions {
				var label string
				var model string

				if partition.FilesystemLabel != "" {
					label = strings.TrimSpace(partition.FilesystemLabel)
				}
				if label == "" && partition.Label != "" {
					label = strings.TrimSpace(partition.Label)
				}
				if label == "" && disk.Model != "" {
					label = strings.TrimSpace(disk.Model)
				}

				if label != "FakeExternalDisk" {
					continue // Skip non-Test disks in this section
				}

				if disk.Model != "" {
					model = disk.Model
				}
				if model == "" {
					model = "Unknown"
				}

				diskInfos = append(diskInfos, DiskInfo{
					Label:      label,
					Model:      model,
					Size:       partition.SizeBytes,
					MountPoint: partition.MountPoint,
				})
			}
		}
	}

	return diskInfos
}

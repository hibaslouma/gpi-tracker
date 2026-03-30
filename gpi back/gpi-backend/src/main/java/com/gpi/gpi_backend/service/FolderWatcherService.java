package com.gpi.gpi_backend.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;

@Service
public class FolderWatcherService {

    private final ClientRecuService clientRecuService;

    @Value("${watcher.folder-path}")
    private String folderPath;

    private WatchService watchService;

    public FolderWatcherService(ClientRecuService clientRecuService) {
        this.clientRecuService = clientRecuService;
    }

    @PostConstruct
    public void init() throws IOException {
        Path path = Paths.get(folderPath);

        // ✅ Create folder if it doesn't exist
        if (!Files.exists(path)) {
            Files.createDirectories(path);
            System.out.println("[FolderWatcher] Folder created: " + folderPath);
        }

        // ✅ Create archive subfolder if it doesn't exist
        Path archive = path.resolve("archive");
        if (!Files.exists(archive)) {
            Files.createDirectories(archive);
            System.out.println("[FolderWatcher] Archive folder created: " + archive);
        }

        this.watchService = FileSystems.getDefault().newWatchService();
        path.register(watchService,
                StandardWatchEventKinds.ENTRY_CREATE,
                StandardWatchEventKinds.ENTRY_MODIFY
        );
        System.out.println("[FolderWatcher] Watching: " + folderPath);
    }

    @Scheduled(fixedDelayString = "${watcher.poll-interval-ms:3000}")
    public void pollFolder() {
        WatchKey key = watchService.poll();
        if (key == null) return;

        for (WatchEvent<?> event : key.pollEvents()) {
            Path fileName = (Path) event.context();
            Path fullPath = Paths.get(folderPath).resolve(fileName);

            // ✅ Skip the archive folder itself and non-files
            if (fileName.toString().equals("archive")) continue;
            if (!Files.isRegularFile(fullPath)) continue;

            // ✅ Log the detected file name clearly
            System.out.println("[FolderWatcher] ✅ New file detected: " + fileName);
            System.out.println("[FolderWatcher] Full path: " + fullPath);
            System.out.println("[FolderWatcher] Event type: " + event.kind());

            try {
                // ✅ Process the file
                clientRecuService.clientRecu(fullPath);

                // ✅ Move to archive after successful processing
                Path archivePath = Paths.get(folderPath).resolve("archive").resolve(fileName);
                Files.move(fullPath, archivePath, StandardCopyOption.REPLACE_EXISTING);
                System.out.println("[FolderWatcher] 📦 File archived: " + fileName + " → archive/");

            } catch (Exception e) {
                System.err.println("[FolderWatcher] ❌ Error processing file: " + fileName + " → " + e.getMessage());
            }
        }

        key.reset();
    }

    @PreDestroy
    public void cleanup() throws IOException {
        if (watchService != null) watchService.close();
        System.out.println("[FolderWatcher] Watcher stopped.");
    }
}
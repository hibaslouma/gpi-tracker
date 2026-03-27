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
        this.watchService = FileSystems.getDefault().newWatchService();
        path.register(
                watchService,
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
            Path changed = Paths.get(folderPath).resolve((Path) event.context());
            System.out.println("[FolderWatcher] Change detected: " + event.kind() + " → " + changed.getFileName());
            clientRecuService.clientRecu(changed);
        }

        key.reset();
    }

    @PreDestroy
    public void cleanup() throws IOException {
        if (watchService != null) watchService.close();
    }
}
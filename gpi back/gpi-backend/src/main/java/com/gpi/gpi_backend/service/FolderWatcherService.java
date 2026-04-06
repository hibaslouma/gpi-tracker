package com.gpi.gpi_backend.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.util.HashMap;
import java.util.Map;

@Service
public class FolderWatcherService {

    private final ClientRecuService clientRecuService;
    private final ClientEmisService clientEmisService;

    @Value("${watcher.folder-path}")
    private String folderRecuPath;
    @Value("${watcher.output-folder-path}")
    private String folderEmisPath;

    private WatchService watchService;
    // Map pour savoir quel dossier correspond à quelle WatchKey
    private final Map<WatchKey, String> keyToFolder = new HashMap<>();


    public FolderWatcherService(ClientRecuService clientRecuService,
                                ClientEmisService clientEmisService) {
        this.clientRecuService = clientRecuService;
        this.clientEmisService = clientEmisService;
    }

    @PostConstruct
    public void init() throws IOException {
        Path path = Paths.get(folderRecuPath);
        this.watchService = FileSystems.getDefault().newWatchService();

        // Surveiller client recu (incoming)
        Path pathRecu = Paths.get(folderRecuPath);
        if (!Files.exists(pathRecu)) Files.createDirectories(pathRecu);
        Path archiveRecu = pathRecu.resolve("archive");
        if (!Files.exists(archiveRecu)) Files.createDirectories(archiveRecu);
        WatchKey keyRecu = pathRecu.register(watchService,
                StandardWatchEventKinds.ENTRY_CREATE,
                StandardWatchEventKinds.ENTRY_MODIFY);
        keyToFolder.put(keyRecu, "RECU");
        System.out.println("[FolderWatcher] Watching RECU: " + folderRecuPath);

        // Surveiller client emis (outgoing)
        Path pathEmis = Paths.get(folderEmisPath);
        if (!Files.exists(pathEmis)) Files.createDirectories(pathEmis);
        Path archiveEmis = pathEmis.resolve("archive");
        if (!Files.exists(archiveEmis)) Files.createDirectories(archiveEmis);
        WatchKey keyEmis = pathEmis.register(watchService,
                StandardWatchEventKinds.ENTRY_CREATE,
                StandardWatchEventKinds.ENTRY_MODIFY);
        keyToFolder.put(keyEmis, "EMIS");
        System.out.println("[FolderWatcher] Watching EMIS: " + folderEmisPath);
    }

    @Scheduled(fixedDelayString = "${watcher.poll-interval-ms:3000}")
    public void pollFolder() {

        WatchKey key = watchService.poll();
        if (key == null) {

            return;
        }
        String typeMsg = keyToFolder.get(key);
        String folderPath = typeMsg.equals("RECU") ? folderRecuPath : folderEmisPath;

        for (WatchEvent<?> event : key.pollEvents()) {
            Path fileName = (Path) event.context();
            Path fullPath = Paths.get(folderPath).resolve(fileName);

            System.out.println("[FolderWatcher]  Event: " + event.kind() + " → " + fileName + " | type: " + typeMsg);

            if (fileName.toString().equals("archive")) continue;
            if (!Files.isRegularFile(fullPath)) continue;



            try {
                if (typeMsg.equals("RECU")) {
                    clientRecuService.clientRecu(fullPath);
                } else {
                    clientEmisService.clientEmis(fullPath);
                }
                Path archivePath = Paths.get(folderPath).resolve("archive").resolve(fileName);
                Files.move(fullPath, archivePath, StandardCopyOption.REPLACE_EXISTING);
                System.out.println("[FolderWatcher]  File archived: " + fileName + " → archive/");
            } catch (Exception e) {
                System.err.println("[FolderWatcher]  Error processing file: " + fileName + " → " + e.getMessage());
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
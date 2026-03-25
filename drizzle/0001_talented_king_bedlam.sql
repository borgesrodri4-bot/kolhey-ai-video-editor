CREATE TABLE `processing_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`step` enum('audio_extraction','transcription','scene_analysis','image_generation','completed') NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`metadata` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processing_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`status` enum('pending','uploading','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`originalVideoUrl` text,
	`originalVideoKey` varchar(512),
	`audioUrl` text,
	`audioKey` varchar(512),
	`fileSizeBytes` int,
	`durationSeconds` float,
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` varchar(128),
	`errorMessage` text,
	`scenesCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_scenes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sceneOrder` int NOT NULL,
	`startTime` float NOT NULL,
	`endTime` float NOT NULL,
	`transcript` text NOT NULL,
	`illustrationPrompt` text,
	`illustrationUrl` text,
	`illustrationKey` varchar(512),
	`illustrationStatus` enum('pending','generating','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_scenes_id` PRIMARY KEY(`id`)
);

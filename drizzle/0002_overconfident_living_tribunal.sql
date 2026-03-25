CREATE TABLE `edit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectId` int NOT NULL,
	`sceneId` int,
	`eventType` enum('prompt_edited','image_regenerated','image_accepted','image_rejected','scene_split','scene_merged','scene_deleted','style_feedback') NOT NULL,
	`previousValue` text,
	`newValue` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `edit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `style_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sceneId` int NOT NULL,
	`projectId` int NOT NULL,
	`sentiment` enum('positive','negative') NOT NULL,
	`illustrationPrompt` text,
	`illustrationUrl` text,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `style_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_style_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`projectsAnalyzed` int NOT NULL DEFAULT 0,
	`confidenceScore` int NOT NULL DEFAULT 0,
	`preferredVisualStyle` text,
	`avgSceneDurationSeconds` float,
	`avgScenesPerMinute` float,
	`topThemes` json,
	`imageStyleModifiers` json,
	`sceneSplitPreferences` json,
	`styleSummary` text,
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_style_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_style_profiles_userId_unique` UNIQUE(`userId`)
);

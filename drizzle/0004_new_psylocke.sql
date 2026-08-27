CREATE TABLE `agentRunFeedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`rating` enum('helpful','not_helpful','safety_concern') NOT NULL,
	`comment` text,
	`reporterUserId` int NOT NULL,
	`reviewed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentRunFeedback_id` PRIMARY KEY(`id`)
);

CREATE TABLE `auditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`eventType` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(100),
	`severity` enum('info','warning','high') NOT NULL DEFAULT 'info',
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` mediumtext NOT NULL,
	`citationPayload` json,
	`retrievalPayload` json,
	`status` enum('answered','insufficient_evidence','error') NOT NULL DEFAULT 'answered',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationCases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`question` text NOT NULL,
	`expectedAnswer` text,
	`expectedDocumentId` int,
	`expectedBehavior` enum('answer','decline') NOT NULL DEFAULT 'answer',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evaluationCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evaluationRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`answer` mediumtext NOT NULL,
	`retrievedDocumentIds` json NOT NULL,
	`retrievalPass` boolean NOT NULL,
	`behaviorPass` boolean NOT NULL,
	`notes` text,
	`runByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evaluationRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`rating` enum('helpful','not_helpful','serious_issue') NOT NULL,
	`comment` text,
	`reporterUserId` int NOT NULL,
	`reviewed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`sourceId` int NOT NULL,
	`ordinal` int NOT NULL,
	`content` mediumtext NOT NULL,
	`keywordTerms` text NOT NULL,
	`semanticTerms` text NOT NULL,
	`tokenEstimate` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledgeChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`originalFilename` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(768) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`byteSize` int NOT NULL,
	`checksum` varchar(96) NOT NULL,
	`status` enum('queued','processing','ready','failed','archived') NOT NULL DEFAULT 'queued',
	`metadata` json,
	`extractionSummary` text,
	`errorMessage` text,
	`ownerUserId` int NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`sourceType` enum('upload','connector','manual') NOT NULL DEFAULT 'upload',
	`classification` enum('internal','confidential','restricted') NOT NULL DEFAULT 'internal',
	`accessLevel` enum('all_users','admins_only') NOT NULL DEFAULT 'all_users',
	`approvalStatus` enum('draft','approved','archived') NOT NULL DEFAULT 'draft',
	`externalConnection` varchar(120),
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeSources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflowDrafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`draftType` enum('response','summary','record_update','other') NOT NULL DEFAULT 'response',
	`content` mediumtext NOT NULL,
	`sourceMessageId` int,
	`targetSystem` varchar(100),
	`status` enum('pending_approval','approved','rejected','cancelled') NOT NULL DEFAULT 'pending_approval',
	`requestedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `workflowDrafts_id` PRIMARY KEY(`id`)
);

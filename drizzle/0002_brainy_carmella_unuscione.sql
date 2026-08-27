CREATE TABLE `agentApprovals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`toolCallId` int,
	`actionSummary` text NOT NULL,
	`proposedPayload` json NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`requestedByUserId` int NOT NULL,
	`reviewedByUserId` int,
	`reviewerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `agentApprovals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentArtifacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`artifactType` enum('research_brief','analysis','draft','plan','other') NOT NULL DEFAULT 'other',
	`title` varchar(220) NOT NULL,
	`content` mediumtext NOT NULL,
	`status` enum('draft','reviewed','archived') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentArtifacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentIntegrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(120) NOT NULL,
	`displayName` varchar(180) NOT NULL,
	`capability` enum('read_only','draft_only','approval_required') NOT NULL DEFAULT 'read_only',
	`status` enum('disabled','ready','connected','error') NOT NULL DEFAULT 'disabled',
	`allowedResources` json,
	`lastHealthCheckAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentIntegrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scope` enum('user','firm') NOT NULL,
	`ownerUserId` int,
	`key` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`sensitivity` enum('internal','confidential') NOT NULL DEFAULT 'internal',
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agentMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` varchar(96) NOT NULL,
	`title` varchar(220) NOT NULL,
	`request` mediumtext NOT NULL,
	`taskType` enum('knowledge','research','analysis','draft','mixed') NOT NULL DEFAULT 'mixed',
	`riskTier` enum('low','review','blocked') NOT NULL DEFAULT 'low',
	`status` enum('running','awaiting_approval','completed','failed','blocked','cancelled') NOT NULL DEFAULT 'running',
	`planPayload` json,
	`result` mediumtext,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `agentRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `agentRuns_threadId_unique` UNIQUE(`threadId`)
);
--> statement-breakpoint
CREATE TABLE `agentStateSnapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`node` varchar(100) NOT NULL,
	`sequence` int NOT NULL,
	`statePayload` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentStateSnapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agentToolCalls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`toolName` varchar(100) NOT NULL,
	`tier` int NOT NULL,
	`inputSummary` text NOT NULL,
	`outputSummary` text,
	`status` enum('planned','allowed','blocked','succeeded','failed','awaiting_approval') NOT NULL DEFAULT 'planned',
	`idempotencyKey` varchar(128) NOT NULL,
	`durationMs` int,
	`errorCode` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `agentToolCalls_id` PRIMARY KEY(`id`)
);

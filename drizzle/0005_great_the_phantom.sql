ALTER TABLE `agentRuns` ADD `recoveryOfRunId` int;--> statement-breakpoint
ALTER TABLE `agentRuns` ADD CONSTRAINT `agentRuns_recoveryOfRunId_unique` UNIQUE(`recoveryOfRunId`);
CREATE TABLE `agentEvaluationResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scenarioName` varchar(180) NOT NULL,
	`request` text NOT NULL,
	`expectedPolicy` enum('allow','review','block') NOT NULL,
	`actualPolicy` enum('allow','review','block') NOT NULL,
	`expectedTools` json,
	`actualTools` json NOT NULL,
	`policyPass` boolean NOT NULL,
	`toolPass` boolean NOT NULL,
	`latencyMs` int NOT NULL,
	`runByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentEvaluationResults_id` PRIMARY KEY(`id`)
);

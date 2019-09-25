#!/usr/bin/env node
import flexi, { FlexiPath, Path, until } from "flexi-path";

import { Command, CommandParser, CommandDeclaration } from "../types";

const rootCommandPath = flexi.path(__dirname).append("commands/");

const isHelp = (...args: string[]): boolean => {
  return (args.length > 0 && args[0] === "-h") || false;
};

const isDebug = (...args: string[]): boolean =>
  args.filter(x => x === "--debug").length > 0;

const mostSpecificCommand = (path: Path): [FlexiPath, ...string[]] => {
  const walked = flexi.walk.back(path, {
    until: until.exists({ ignoreFileExtensions: true })
  });

  const args = walked.diff.segments;

  let matchedCommand = walked.result;

  if (walked.result.isEmpty() || walked.result.path === rootCommandPath.path) {
    return [flexi.empty(), ...args];
  }

  if (!matchedCommand.exists()) {
    const parent = matchedCommand.parent();
    matchedCommand =
      parent.files().find(x => x.name === matchedCommand.name) ||
      parent.files().find(x => x.name === "index") ||
      flexi.empty();
  }

  return [matchedCommand, ...args];
};

/* eslint-disable import/no-dynamic-require,global-require,@typescript-eslint/no-var-requires */
const requireContent = (path: FlexiPath): CommandDeclaration =>
  require(path.path).default;
/* eslint-enable import/no-dynamic-require,global-require,@typescript-eslint/no-var-requires */

export const empty: Command = {
  args: [],
  description: "",
  fullName: "",
  helpName: "",
  run: () => {},
  subCommands: [],
  name: "empty",
  hint: ""
};

const createCommand = (currentPath: Path): Command => {
  const [path, ...args] = mostSpecificCommand(currentPath);

  if (!path.exists()) {
    return empty;
  }

  const content = requireContent(path);

  if (!content) {
    return empty;
  }

  const name = path.name === "index" ? path.parent().name : path.name;
  const parent = path.parent().except(rootCommandPath);

  const parentName =
    parent.isEmpty() || parent.isRoot() ? "" : `${parent.name} `;
  const fullName = `${parentName}${name}`;

  const subCommands = path
    .children()
    .filter(x => x !== undefined && !x.isEmpty() && x.name !== "index")
    .map(x => createCommand(x));

  const command = {
    ...{ args, fullName, name, subCommands },
    ...content
  } as Command;

  return command;
};

const allCommands = (): Command[] => {
  return rootCommandPath
    .children()
    .map(x => createCommand(x))
    .filter(x => x !== empty);
};

const withoutOptions = (...args: string[]): string[] =>
  args.filter(x => !x.startsWith("-"));

const parse = (path: Path): Command => {
  if (flexi.isEmpty(path)) {
    return empty;
  }

  const command = createCommand(flexi.path(rootCommandPath).append(path));

  return command;
};

const commandParser = (...args: string[]): CommandParser => {
  const cleanArgs = withoutOptions(...args);

  return {
    all: () => allCommands(),
    find: () => parse(cleanArgs),
    isHelp: isHelp(...args),
    isDebug: isDebug(...args),
    stripOptions: () => cleanArgs
  };
};

export default commandParser;

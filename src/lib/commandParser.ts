#!/usr/bin/env node
import flexi, { FlexiPath, Path, until } from "flexi-path";
import argsAny from "args-any";
import { CommandParser } from "../types";
import command, { Command } from "../models/command";
import declaration, { create, CommandDeclaration } from "../models/commandDeclaration";

const rootCommandPath = flexi.path(__dirname).append("commands/");

const isHelp = (...args: string[]): boolean => {
  return (args.length > 0 && args[0] === "-h") || false;
};

const isDebug = (...args: string[]): boolean => args.filter(x => x === "--debug").length > 0;

const isCommandRoot = (path: FlexiPath) => {
  const pathString = path.path.endsWith("/") ? path.path : `${path.path}/`;

  return pathString === rootCommandPath.path;
};

const mostSpecificCommand = (path: FlexiPath): [FlexiPath, ...string[]] => {
  const pathSegments = path.segments;

  const options = argsAny.parse(pathSegments);
  const pathWithoutOptions = options.args.other();

  const walked = flexi.walk.back(pathWithoutOptions, {
    until: until.exists({ ignoreFileExtensions: true })
  });

  const args = walked.diff.prepend(...options.args.options()).segments;

  let matchedCommand = walked.result;

  if (walked.result.isEmpty() || isCommandRoot(walked.result)) {
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
const requireContent = (path: FlexiPath): Command => require(path.path).default;
/* eslint-enable import/no-dynamic-require,global-require,@typescript-eslint/no-var-requires */

const withoutOptions = (...args: string[]): string[] => args.filter(x => !x.startsWith("-"));

const createCommand = (path: FlexiPath): CommandDeclaration => {
  const [commandPath, ...args] = mostSpecificCommand(path);

  if (!commandPath.exists()) {
    return declaration.empty;
  }

  const currentCommand = requireContent(commandPath);

  if (!currentCommand) {
    return declaration.empty;
  }

  const trimmedPath = commandPath.except(rootCommandPath).parent(x => x.name !== "index");

  const { name } = trimmedPath;
  const fullName = trimmedPath
    .flatten()
    .map(x => x.name)
    .join(" ");

  const subCommands = commandPath
    .children()
    .filter(x => x !== undefined && !x.isEmpty() && x.name !== "index")
    .map(x => createCommand(x));

  const decl: CommandDeclaration = create({
    args,
    canRun: currentCommand.run !== command.empty.run,
    fullName,
    name,
    subCommands,
    command: currentCommand
  });

  return decl;
};

const allCommands = (): CommandDeclaration[] => {
  return rootCommandPath
    .children()
    .map(x => createCommand(x))
    .filter(x => x !== declaration.empty);
};

const parse = (path: Path): CommandDeclaration => {
  if (flexi.isEmpty(path)) {
    return declaration.empty;
  }

  return createCommand(flexi.path(rootCommandPath).append(path));
};

const commandParser = (...args: string[]): CommandParser => {
  const cleanArgs = withoutOptions(...args);

  return {
    all: () => allCommands(),
    find: () => parse(args),
    isHelp: isHelp(...args),
    isDebug: isDebug(...args),
    stripOptions: () => cleanArgs
  };
};

export default commandParser;

import os from "os";
import promptly from "promptly";

import flexi from "flexi-path";
import { ConfigCreationData, PromptBody, PromptType } from "../../../types";

const promptTypes = new Map<PromptType, PromptBody>([
  [PromptType.Text, promptly.prompt],
  [PromptType.Password, promptly.password],
  [PromptType.Confirm, promptly.confirm]
]);

const line = async <T>(
  text: string,
  defaultValue?: string,
  type = PromptType.Text,
  defaultText?: string
): Promise<T> => {
  const currentDefault = defaultText || defaultValue;
  const currentDefaultText = currentDefault ? ` [${currentDefault}]` : "";
  const message = `${text}${currentDefaultText}: `;

  return (promptTypes.get(type) as PromptBody)(message, {
    default: defaultValue
  });
};

export const prompt = async (): Promise<ConfigCreationData> => {
  const yes = "y";
  const yesNo = "Y/n";

  const defaults: ConfigCreationData = {
    host: "192.168.1.1",
    userName: "admin",
    privateKey: flexi.path(os.homedir()).append(".ssh/id_rsa").path,
    passPhrase: "",
    createKeyFile: true,
    addKeyToAgent: true
  };

  const host = await line("Router address", defaults.host);
  const userName = await line("User name", defaults.userName);
  const privateKey = await line("SSH private key file", defaults.privateKey);
  const passPhrase = await line(
    "Passphrase for private key",
    defaults.passPhrase,
    PromptType.Password
  );

  const keyFileExists = flexi.exists(privateKey as string);

  let createKeyFile = false;

  if (!keyFileExists) {
    createKeyFile = await line(
      `The key file "${privateKey}" does not exist. Do you want to create it?`,
      yes,
      PromptType.Confirm,
      yesNo
    );
  }

  const addKeyToAgent = await line(
    `Do you want to add the key "${privateKey}" to the SSH Agent?`,
    yes,
    PromptType.Confirm,
    yesNo
  );

  return {
    host,
    userName,
    privateKey,
    passPhrase,
    createKeyFile,
    addKeyToAgent
  } as ConfigCreationData;
};

export default prompt;

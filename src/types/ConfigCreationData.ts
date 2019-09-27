import flexi from "flexi-path";
import { homedir } from "os";
import sshConfig, { SshConfig } from "./SshConfig";

export interface ConfigCreationData extends SshConfig {
  passPhrase: string;
  createKeyFile: boolean;
  addKeyToAgent: boolean;
}

export const empty = (): ConfigCreationData => ({
  ...sshConfig.empty,
  ...{
    passPhrase: "",
    createKeyFile: false,
    addKeyToAgent: false
  }
});

export const defaults: ConfigCreationData = {
  host: "192.168.1.1",
  userName: "admin",
  privateKey: flexi.path(homedir()).append(".ssh/id_rsa").path,
  passPhrase: "",
  createKeyFile: true,
  addKeyToAgent: true
};

export default {
  defaults,
  empty
};

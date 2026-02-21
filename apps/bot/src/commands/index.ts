import type { BotCommand } from "../client.js";
import * as chup from "./chup.js";
import * as ketnoi from "./ketnoi.js";
import * as huyketnoi from "./huyketnoi.js";
import * as banbe from "./banbe.js";
import * as caidat from "./caidat.js";
import * as kyniem from "./kyniem.js";
import * as loimoi from "./loimoi.js";
import * as hethong from "./hethong.js";
import * as tamtrang from "./tamtrang.js";

export const commands: BotCommand[] = [
  chup.command,
  ketnoi.command,
  huyketnoi.command,
  banbe.command,
  caidat.command,
  kyniem.command,
  loimoi.command,
  hethong.command,
  tamtrang.command,
];

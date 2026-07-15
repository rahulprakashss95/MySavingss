import type { Owned } from "./common";

export type ClientModel = Owned & {
  id: string;
  /** @deprecated Retained for older rows; ownership is now `ownerId`. */
  loginUserId: string;
  mobile: MobileModel[] | null;
  name: string;
};

type MobileModel = {
  id: string;
  pref: boolean;
  type: string;
  value: string;
};

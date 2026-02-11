import mongoose, { Schema, model, models, Model } from "mongoose";

interface ISettings {
  _id: string;
  storeName: string;
  supportEmail: string;
  returnPolicy: string;
  termsOfService: string;
  isVaultLive: boolean;
  dropCountdown?: Date;
  maintenanceMode: boolean;
}

interface ISettingsModel extends Model<ISettings> {
  getSettings(): Promise<ISettings>;
}

const SettingsSchema = new Schema(
  {
    _id: { type: String, default: "global" },
    storeName: { type: String, default: "KTXZ SHOP" },
    supportEmail: { type: String, default: "support@ktxz.shop" },
    returnPolicy: { type: String, default: "" },
    termsOfService: { type: String, default: "" },
    isVaultLive: { type: Boolean, default: false },
    dropCountdown: { type: Date },
    maintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Singleton helper: always fetch/upsert the single "global" document
SettingsSchema.statics.getSettings = async function () {
  let settings = await this.findById("global");
  if (!settings) {
    settings = await this.create({ _id: "global" });
  }
  return settings;
};

const Settings =
  (models.Settings as ISettingsModel) ||
  model<ISettings, ISettingsModel>("Settings", SettingsSchema);

export default Settings;

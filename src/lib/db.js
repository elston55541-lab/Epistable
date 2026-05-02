import { supabase } from "./supabase";
import { maybeOne, requireData, rows } from "./supabaseSafe";

const byCreatedDesc = { ascending: false };
const byTsDesc = { ascending: false };

export const DB = {
  async getProfileByAuthUserId(authUserId) {
    return maybeOne(await supabase.from("profiles").select("*").eq("auth_user_id", authUserId).maybeSingle());
  },

  async getFac(id) {
    return maybeOne(await supabase.from("factories").select().eq("id", id).maybeSingle());
  },

  async updFac(id, updates) {
    return requireData(await supabase.from("factories").update(updates).eq("id", id).select().single());
  },

  async allFacs() {
    return rows(await supabase.from("factories").select().order("created_at", byCreatedDesc));
  },

  async facUsers(factoryId) {
    return rows(await supabase.from("profiles").select().eq("factory_id", factoryId));
  },

  async allUsers() {
    return rows(await supabase.from("profiles").select().order("created_at", byCreatedDesc));
  },

  async facInsps(factoryId) {
    return rows(await supabase.from("inspections").select().eq("factory_id", factoryId).order("ts", byTsDesc).limit(300));
  },

  async userInsps(userId) {
    return rows(await supabase.from("inspections").select().eq("user_id", userId).order("ts", byTsDesc).limit(200));
  },

  async allInsps() {
    return rows(await supabase.from("inspections").select().order("ts", byTsDesc));
  },
};

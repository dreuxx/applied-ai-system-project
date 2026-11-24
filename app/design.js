import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLang } from "./lang";
export const c = {
  bg: "#150f19",
  panel: "#261d2c",
  line: "#44364a",
  text: "#fbf6f7",
  soft: "#c9bac9",
  lime: "#dfff55",
};
export function T({ children, style, ...props }) {
  return (
    <Text style={[st.text, style]} {...props}>
      {children}
    </Text>
  );
}
export function Button({
  children,
  onPress,
  primary = false,
  selected = false,
  label,
  disabled = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        st.button,
        (primary || selected) && st.bright,
        { opacity: disabled ? 0.55 : pressed ? 0.78 : 1 },
      ]}
    >
      <T
        style={{
          fontWeight: "700",
          color: primary || selected ? c.bg : c.text,
        }}
      >
        {children}
      </T>
    </Pressable>
  );
}
export function Input(props) {
  return (
    <TextInput placeholderTextColor="#afa0b3" style={st.input} {...props} />
  );
}
export function Sheet({ title, onClose, children }) {
  const { t } = useLang();
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={st.overlay}>
        <View accessibilityViewIsModal style={st.sheet}>
          <View style={st.between}>
            <T accessibilityRole="header" style={[st.h2, { flex: 1 }]}>
              {title}
            </T>
            <Button label={t("close")} onPress={onClose}>
              {t("close")} ×
            </Button>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 14, paddingVertical: 12 }}
          >
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  text: { color: c.text, fontSize: 15 },
  small: { color: c.soft, fontSize: 13 },
  frame: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    paddingHorizontal: 18,
  },
  bar: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: c.line,
  },
  logo: { fontSize: 30, fontWeight: "900", letterSpacing: -1.9 },
  hero: {
    minHeight: 210,
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#49223c",
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 47,
    lineHeight: 46,
    letterSpacing: -2.5,
    marginVertical: 10,
  },
  h1: { fontWeight: "900", fontSize: 36, letterSpacing: -1.7 },
  h2: { fontWeight: "800", fontSize: 23, letterSpacing: -0.9 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  button: {
    alignSelf: "flex-start",
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 22,
    backgroundColor: c.panel,
  },
  bright: { backgroundColor: c.lime, borderColor: c.lime },
  input: {
    backgroundColor: c.panel,
    color: c.text,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 46,
    fontSize: 16,
  },
  section: { gap: 12, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 65 },
  cover: { width: 50, height: 50, borderRadius: 7 },
  title: { fontSize: 17, fontWeight: "700" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#1b1420",
    borderTopWidth: 1,
    borderColor: c.line,
  },
  tab: { alignItems: "center", padding: 9, minWidth: 78, minHeight: 49 },
  lang: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 17,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#09070ccf",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: c.panel,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: 550,
    maxHeight: "88%",
  },
});

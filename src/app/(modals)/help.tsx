import { View, Text, StyleSheet } from "react-native";

export default function HelpModal() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help</Text>
      <Text style={styles.body}>Help content is coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f1f1f",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: "#5a5a5a",
    textAlign: "center",
  },
});

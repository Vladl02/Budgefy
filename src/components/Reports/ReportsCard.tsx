import { View, Text, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";

type ReportCardProps = {
  title: string;
  date: string;
  amount: string;
};

export default function ReportCard({ title, date, amount }: ReportCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.photo} />

      <View style={styles.textColumn}>
        <Text style={styles.metaText}>{date}</Text>
        <Text style={styles.titleText}>{title}</Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.rightColumn}>
        <View style={styles.statusBox}>
          <Check size={12} color="#1eff00ff" strokeWidth={4} />
        </View>
        <Text style={styles.amount}>{amount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "90%",
    height: 80,
    borderRadius: 15,
    backgroundColor: "#5E6C37",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  photo: {
    width: 70,
    height: 70,
    backgroundColor: "white",
    borderRadius: 10,
    marginLeft: 5,
  },
  textColumn: {
    marginLeft: 10,
    justifyContent: "center",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EAE8C7",
    marginBottom: 2,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FEFADF",
  },
  rightColumn: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginRight: 8,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fff",
    borderRadius: 100,
    paddingHorizontal: 4,
    height: 20,
    marginBottom: 25,
  },
  status: {
    color: "white",
    fontWeight: "900",
    fontSize: 13,
    marginLeft: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FEFADF",
  },
});
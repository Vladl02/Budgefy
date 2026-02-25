import React, { useMemo, useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type TagSearchModalProps = {
  visible: boolean;
  title: string;
  items: string[];
  onAdd: (value: string) => void;
  onDismiss: () => void;
  placeholder?: string;
  addLabel?: string;
  closeOnAdd?: boolean;
};

const VISIBLE_ITEMS = 6;
const ITEM_HEIGHT = 40;
const ITEM_GAP = 8;
const LIST_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT + (VISIBLE_ITEMS - 1) * ITEM_GAP;

export function TagSearchModal({
  visible,
  title,
  items,
  onAdd,
  onDismiss,
  placeholder = "Search...",
  addLabel = "Add",
  closeOnAdd = true,
}: TagSearchModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed === "") return items.slice(0, 20);
    return items.filter((item) => item.toLowerCase().includes(trimmed)).slice(0, 20);
  }, [items, query]);

  const handleAdd = () => {
    const value = query.trim();
    if (!value) return;
    onAdd(value);
    if (closeOnAdd) onDismiss();
  };

  const canAdd = query.trim().length > 0;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor="#9A9A9A"
              style={styles.input}
              autoCorrect={false}
            />
            <Pressable
              style={[styles.addButton, !canAdd ? styles.addButtonDisabled : null]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={[styles.addButtonText, !canAdd ? styles.addButtonTextDisabled : null]}>
                {addLabel}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>No matches</Text>
            ) : (
              filtered.map((item) => (
                <Pressable key={item} style={styles.listItem} onPress={() => setQuery(item)}>
                  <Text style={styles.listText}>{item}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
    opacity: 0.45,
  },
  card: {
    width: "86%",
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F3F3F3",
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1F1F1F",
  },
  addButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#5F6F2A",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#B7B7B7",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  addButtonTextDisabled: {
    color: "#F0F0F0",
  },
  list: {
    height: LIST_HEIGHT,
  },
  listContent: {
    paddingBottom: 6,
  },
  listItem: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F6F6F6",
    marginBottom: ITEM_GAP,
  },
  listText: {
    color: "#2A2A2A",
    fontSize: 14,
  },
  emptyText: {
    color: "#888888",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Minus,
  PiggyBank,
  Plus,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SlidingSheet } from "@/src/components/SlidingSheet";

type GoalIconName = "shield" | "target" | "trend" | "piggy";

type Goal = {
  id: string;
  name: string;
  current: number;
  target: number;
  color: string;
  iconName: GoalIconName;
};
type ArchivedGoal = Goal & {
  archivedAt: number;
};

const INITIAL_GOALS: Goal[] = [
  { id: "1", name: "Emergency Fund", current: 4500, target: 10000, color: "#00DDB7", iconName: "shield" },
  { id: "2", name: "New MacBook", current: 1200, target: 2400, color: "#7E57FF", iconName: "target" },
  { id: "3", name: "Summer Trip", current: 800, target: 3000, color: "#FFC83C", iconName: "trend" },
];

const HERO_PARTICLES = [
  { left: "8%", top: "16%", size: 5, drift: 8, peakOpacity: 0.36 },
  { left: "14%", top: "38%", size: 3, drift: 7, peakOpacity: 0.24 },
  { left: "22%", top: "62%", size: 4, drift: 10, peakOpacity: 0.3 },
  { left: "28%", top: "12%", size: 2, drift: 6, peakOpacity: 0.22 },
  { left: "34%", top: "30%", size: 3, drift: 7, peakOpacity: 0.28 },
  { left: "41%", top: "52%", size: 2, drift: 6, peakOpacity: 0.2 },
  { left: "48%", top: "70%", size: 6, drift: 11, peakOpacity: 0.33 },
  { left: "53%", top: "84%", size: 3, drift: 8, peakOpacity: 0.26 },
  { left: "58%", top: "18%", size: 4, drift: 9, peakOpacity: 0.32 },
  { left: "64%", top: "34%", size: 2, drift: 7, peakOpacity: 0.2 },
  { left: "69%", top: "48%", size: 3, drift: 8, peakOpacity: 0.3 },
  { left: "74%", top: "78%", size: 2, drift: 6, peakOpacity: 0.21 },
  { left: "79%", top: "26%", size: 5, drift: 10, peakOpacity: 0.35 },
  { left: "84%", top: "12%", size: 3, drift: 8, peakOpacity: 0.25 },
  { left: "88%", top: "68%", size: 4, drift: 9, peakOpacity: 0.31 },
  { left: "92%", top: "44%", size: 2, drift: 6, peakOpacity: 0.2 },
  { left: "6%", top: "54%", size: 3, drift: 8, peakOpacity: 0.29 },
  { left: "12%", top: "76%", size: 4, drift: 9, peakOpacity: 0.33 },
  { left: "18%", top: "24%", size: 2, drift: 6, peakOpacity: 0.22 },
  { left: "24%", top: "82%", size: 5, drift: 11, peakOpacity: 0.4 },
  { left: "31%", top: "58%", size: 3, drift: 8, peakOpacity: 0.3 },
  { left: "37%", top: "72%", size: 4, drift: 10, peakOpacity: 0.34 },
  { left: "44%", top: "14%", size: 2, drift: 6, peakOpacity: 0.24 },
  { left: "51%", top: "26%", size: 5, drift: 11, peakOpacity: 0.39 },
  { left: "57%", top: "56%", size: 3, drift: 8, peakOpacity: 0.3 },
  { left: "63%", top: "86%", size: 4, drift: 10, peakOpacity: 0.35 },
  { left: "70%", top: "10%", size: 2, drift: 6, peakOpacity: 0.23 },
  { left: "76%", top: "58%", size: 5, drift: 11, peakOpacity: 0.4 },
  { left: "82%", top: "82%", size: 3, drift: 8, peakOpacity: 0.31 },
  { left: "89%", top: "20%", size: 4, drift: 10, peakOpacity: 0.36 },
  { left: "95%", top: "72%", size: 2, drift: 6, peakOpacity: 0.24 },
  { left: "27%", top: "44%", size: 3, drift: 7, peakOpacity: 0.28 },
  { left: "47%", top: "40%", size: 2, drift: 6, peakOpacity: 0.22 },
  { left: "67%", top: "30%", size: 3, drift: 7, peakOpacity: 0.29 },
];

const formatAmount = (value: number): string =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const withAlpha = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return "rgba(17, 24, 39, 0.08)";
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function SavingsManager() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [archivedGoals, setArchivedGoals] = useState<ArchivedGoal[]>([]);
  const [isCompletedModalVisible, setCompletedModalVisible] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const particleAnimsRef = useRef<Animated.Value[]>([]);
  if (particleAnimsRef.current.length !== HERO_PARTICLES.length) {
    particleAnimsRef.current = HERO_PARTICLES.map(
      (_, index) => particleAnimsRef.current[index] ?? new Animated.Value(0),
    );
  }
  const particleAnims = particleAnimsRef.current;

  useEffect(() => {
    const loops = particleAnims.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(value, {
            toValue: 1,
            duration: 1600 + index * 120,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1600 + index * 120,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [particleAnims]);

  const totalSaved = useMemo(() => goals.reduce((acc, goal) => acc + goal.current, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((acc, goal) => acc + goal.target, 0), [goals]);
  const averageProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const activeCompletedGoals = useMemo(
    () => goals.filter((goal) => goal.current >= goal.target),
    [goals],
  );
  const completedGoals = activeCompletedGoals.length + archivedGoals.length;
  const completedGoalRecords = useMemo(
    () => [
      ...activeCompletedGoals.map((goal) => ({
        ...goal,
        isArchived: false as const,
        archivedAt: null as number | null,
      })),
      ...archivedGoals.map((goal) => ({
        ...goal,
        isArchived: true as const,
      })),
    ],
    [activeCompletedGoals, archivedGoals],
  );

  const handleDismiss = () => {
    router.back();
  };

  const handleCreateGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget.trim()) {
      Alert.alert("Missing details", "Please add a goal name and target amount.");
      return;
    }

    const targetAmount = Number.parseFloat(newGoalTarget);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      Alert.alert("Invalid target", "Please enter a valid target amount greater than 0.");
      return;
    }

    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;

    const newGoal: Goal = {
      id: Date.now().toString(),
      name: newGoalName.trim(),
      current: 0,
      target: targetAmount,
      color: randomColor,
      iconName: "piggy",
    };

    setGoals((prev) => [newGoal, ...prev]);
    setNewGoalName("");
    setNewGoalTarget("");
    setAddModalVisible(false);
  };

  const handleUpdateFunds = (type: "add" | "withdraw") => {
    if (!selectedGoal || !transactionAmount) return;
    const amount = Number.parseFloat(transactionAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount greater than 0.");
      return;
    }

    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== selectedGoal.id) return goal;
        const nextCurrent = type === "add" ? goal.current + amount : goal.current - amount;
        return { ...goal, current: Math.max(0, nextCurrent) };
      }),
    );

    setTransactionAmount("");
    setSelectedGoal(null);
  };

  const closeManageModal = () => {
    setSelectedGoal(null);
    setTransactionAmount("");
  };
  const showAverageProgressInfo = () => {
    Alert.alert(
      "Average Progress",
      "This metric is calculated as (total saved across goals / total target across goals) × 100.",
      [{ text: "Got it" }],
    );
  };
  const archiveGoal = (goalId: string) => {
    const goalToArchive = goals.find((goal) => goal.id === goalId);
    if (!goalToArchive || goalToArchive.current < goalToArchive.target) return;

    setArchivedGoals((prev) => [{ ...goalToArchive, archivedAt: Date.now() }, ...prev]);
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    if (selectedGoal?.id === goalId) {
      closeManageModal();
    }
  };
  const handleDeleteGoal = () => {
    if (!selectedGoal) return;
    const goalId = selectedGoal.id;
    Alert.alert(
      "Remove goal",
      `Delete "${selectedGoal.name}" from your savings goals?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
            closeManageModal();
          },
        },
      ],
      { cancelable: true },
    );
  };

  const renderIcon = (name: GoalIconName, color: string, size = 20) => {
    switch (name) {
      case "shield":
        return <ShieldCheck size={size} color={color} />;
      case "target":
        return <Target size={size} color={color} />;
      case "trend":
        return <TrendingUp size={size} color={color} />;
      default:
        return <PiggyBank size={size} color={color} />;
    }
  };
  const renderArchiveAction = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const opacity = progress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.55, 1],
      extrapolate: "clamp",
    });
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.88, 1],
      extrapolate: "clamp",
    });
    const translateX = dragX.interpolate({
      inputRange: [-120, -30, 0],
      outputRange: [0, 8, 20],
      extrapolate: "clamp",
    });

    return (
      <Animated.View style={[styles.archiveSwipeAction, { opacity, transform: [{ translateX }, { scale }] }]}>
        <Trash2 size={14} color="#FFFFFF" />
        <Text style={styles.archiveSwipeText}>Release to archive</Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <SlidingSheet onDismiss={handleDismiss} heightPercent={0.86} backdropOpacity={0.42}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.heroCard}>
            <View pointerEvents="none" style={styles.heroParticlesLayer}>
              {HERO_PARTICLES.map((particle, index) => {
                const anim = particleAnims[index];
                const translateY = anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -particle.drift],
                });
                const scale = anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.82, 1.08, 0.9],
                });
                const opacity = anim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.14, particle.peakOpacity + 0.08, 0.2],
                });

                return (
                  <Animated.View
                    key={`hero-particle-${index}`}
                    style={[
                      styles.heroParticle,
                      {
                        width: particle.size,
                        height: particle.size,
                        left: particle.left,
                        top: particle.top,
                        opacity,
                        transform: [{ translateY }, { scale }],
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconWrap}>
                  <PiggyBank size={22} color="#FFFFFF" />
                </View>
                <Pressable style={styles.addSmallButton} onPress={() => setAddModalVisible(true)}>
                  <Plus size={14} color="#111827" />
                  <Text style={styles.addSmallText}>New Goal</Text>
                </Pressable>
              </View>
              <Text style={styles.heroLabel}>Total Saved</Text>
              <Text style={styles.heroAmount}>{formatAmount(totalSaved)}</Text>
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatLabel}>Targets</Text>
                  <Text style={styles.heroStatValue}>{goals.length}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.heroStatCard, pressed ? styles.heroStatCardPressed : null]}
                  onPress={() => setCompletedModalVisible(true)}
                >
                  <Text style={styles.heroStatLabel}>Completed</Text>
                  <Text style={styles.heroStatValue}>{completedGoals}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.heroStatCard, pressed ? styles.heroStatCardPressed : null]}
                  onPress={showAverageProgressInfo}
                >
                  <Text style={styles.heroStatLabel}>Avg. Progress</Text>
                  <Text style={styles.heroStatValue}>{averageProgress}%</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Savings Goals</Text>
            <Text style={styles.sectionSubtitle}>Tap a goal to manage deposits and withdrawals</Text>
          </View>

          {goals.map((goal) => {
            const progress = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
            const remaining = Math.max(goal.target - goal.current, 0);
            const isCompleted = goal.current >= goal.target;

            const goalCard = (
              <Pressable
                style={[styles.goalCard, isCompleted ? styles.goalCardCompleted : null]}
                onPress={isCompleted ? undefined : () => setSelectedGoal(goal)}
                disabled={isCompleted}
              >
                <View style={styles.goalTopRow}>
                  <View style={[styles.goalIconWrap, { backgroundColor: withAlpha(goal.color, 0.16) }]}>
                    {renderIcon(goal.iconName, goal.color)}
                  </View>
                  <View style={styles.goalTitleWrap}>
                    <Text style={styles.goalName} numberOfLines={1}>
                      {goal.name}
                    </Text>
                    <Text style={styles.goalSubtext}>
                      {formatAmount(goal.current)} saved of {formatAmount(goal.target)}
                    </Text>
                  </View>
                  <View style={[styles.goalPercentPill, isCompleted ? styles.goalPercentPillCompleted : null]}>
                    <Text style={[styles.goalPercentText, isCompleted ? styles.goalPercentTextCompleted : null]}>
                      {isCompleted ? "Reached" : `${Math.round(progress)}%`}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: goal.color }]} />
                </View>

                <View style={styles.goalBottomRow}>
                  <Text style={styles.goalRemainingText}>
                    {isCompleted ? "Goal completed" : `Remaining ${formatAmount(remaining)}`}
                  </Text>
                  <Text style={[styles.goalManageHint, isCompleted ? styles.goalManageHintCompleted : null]}>
                    {isCompleted ? "Swipe left to archive" : "Manage"}
                  </Text>
                </View>
              </Pressable>
            );

            if (isCompleted) {
              return (
                <View key={goal.id} style={styles.goalListItem}>
                  <View style={styles.goalSwipeWrap}>
                <Swipeable
                  ref={(instance) => {
                    swipeableRefs.current[goal.id] = instance;
                  }}
                  friction={2}
                  overshootFriction={8}
                  overshootRight={false}
                  rightThreshold={40}
                  onSwipeableOpen={(direction) => {
                    if (direction === "right") {
                      swipeableRefs.current[goal.id]?.close();
                      setTimeout(() => {
                        archiveGoal(goal.id);
                      }, 140);
                    }
                  }}
                  renderRightActions={renderArchiveAction}
                >
                  {goalCard}
                </Swipeable>
                  </View>
                </View>
              );
            }

            return (
              <View key={goal.id} style={styles.goalListItem}>
                {goalCard}
              </View>
            );
          })}

          {goals.length === 0 ? (
            <View style={styles.emptyGoalsState}>
              <Text style={styles.emptyGoalsTitle}>No active goals</Text>
              <Text style={styles.emptyGoalsSubtitle}>Create a goal to start tracking your savings progress.</Text>
            </View>
          ) : null}

          <Pressable style={styles.primaryCta} onPress={() => setAddModalVisible(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.primaryCtaText}>Create Savings Goal</Text>
          </Pressable>
        </ScrollView>

        <Modal
          visible={isCompletedModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setCompletedModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setCompletedModalVisible(false)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalTitle}>Completed Goals</Text>
                  <Text style={styles.modalSubtitle}>Reached goals can be archived with a left swipe.</Text>
                </View>
                <Pressable onPress={() => setCompletedModalVisible(false)} hitSlop={8}>
                  <X size={22} color="#6B7280" />
                </Pressable>
              </View>
              <ScrollView style={styles.completedList} showsVerticalScrollIndicator={false}>
                {completedGoalRecords.length === 0 ? (
                  <Text style={styles.emptyCompletedText}>No completed goals yet.</Text>
                ) : (
                  completedGoalRecords.map((goal) => (
                    <View key={`completed-${goal.id}`} style={styles.completedItem}>
                      <View style={styles.completedItemTextWrap}>
                        <Text style={styles.completedItemName}>{goal.name}</Text>
                        <Text style={styles.completedItemSub}>
                          {formatAmount(goal.current)} of {formatAmount(goal.target)}
                        </Text>
                        {goal.archivedAt ? (
                          <Text style={styles.completedArchivedAt}>
                            Archived{" "}
                            {new Date(goal.archivedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.completedBadge,
                          goal.isArchived ? styles.completedBadgeArchived : styles.completedBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.completedBadgeText,
                            goal.isArchived ? styles.completedBadgeTextArchived : styles.completedBadgeTextActive,
                          ]}
                        >
                          {goal.isArchived ? "Archived" : "Active"}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={isAddModalVisible} animationType="fade" transparent onRequestClose={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboardWrap}>
              <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Savings Goal</Text>
                <Pressable onPress={() => setAddModalVisible(false)} hitSlop={8}>
                  <X size={22} color="#6B7280" />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Goal Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Europe Trip"
                placeholderTextColor="#9CA3AF"
                value={newGoalName}
                onChangeText={setNewGoalName}
              />

              <Text style={styles.inputLabel}>Target Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="10000"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                value={newGoalTarget}
                onChangeText={setNewGoalTarget}
              />

              <Pressable style={styles.modalPrimaryButton} onPress={handleCreateGoal}>
                <Text style={styles.modalPrimaryButtonText}>Create Goal</Text>
              </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>

        <Modal visible={!!selectedGoal} animationType="fade" transparent onRequestClose={closeManageModal}>
          <Pressable style={styles.modalOverlay} onPress={closeManageModal}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKeyboardWrap}>
              <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Text style={styles.modalTitle}>{selectedGoal?.name}</Text>
                  <Text style={styles.modalSubtitle}>Current balance {formatAmount(selectedGoal?.current ?? 0)}</Text>
                </View>
                <Pressable onPress={closeManageModal} hitSlop={8}>
                  <X size={22} color="#6B7280" />
                </Pressable>
              </View>

              <View style={styles.moneyInputWrap}>
                <Text style={styles.moneyPrefix}>$</Text>
                <TextInput
                  style={styles.moneyInput}
                  placeholder="0"
                  placeholderTextColor="#D1D5DB"
                  keyboardType="decimal-pad"
                  value={transactionAmount}
                  onChangeText={setTransactionAmount}
                  autoFocus
                />
              </View>

              <View style={styles.actionRow}>
                <Pressable style={[styles.actionButton, styles.withdrawButton]} onPress={() => handleUpdateFunds("withdraw")}>
                  <Minus size={18} color="#DC2626" />
                  <Text style={styles.withdrawText}>Withdraw</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.depositButton]} onPress={() => handleUpdateFunds("add")}>
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={styles.depositText}>Deposit</Text>
                </Pressable>
              </View>
              <Pressable style={styles.deleteGoalButton} onPress={handleDeleteGoal}>
                <Trash2 size={16} color="#DC2626" />
                <Text style={styles.deleteGoalText}>Remove Goal</Text>
              </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </SlidingSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  heroCard: {
    borderRadius: 20,
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 14,
    overflow: "hidden",
    position: "relative",
  },
  heroParticlesLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroParticle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "#57A7FD",
  },
  heroContent: {
    zIndex: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  addSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addSmallText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  heroLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
    color: "#C6D0E3",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  heroAmount: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroStatsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 9,
  },
  heroStatCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#C6D0E3",
  },
  heroStatValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  goalCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  goalListItem: {
    marginBottom: 10,
  },
  goalSwipeWrap: {
    borderRadius: 18,
    overflow: "hidden",
  },
  goalCardCompleted: {
    borderColor: "rgba(34,197,94,0.42)",
    backgroundColor: "rgba(34,197,94,0.1)",
  },
  goalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitleWrap: {
    flex: 1,
  },
  goalName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  goalSubtext: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  goalPercentPill: {
    backgroundColor: "#111827",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goalPercentPillCompleted: {
    backgroundColor: "rgba(22,163,74,0.18)",
    borderWidth: 1,
    borderColor: "rgba(22,163,74,0.5)",
  },
  goalPercentText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  goalPercentTextCompleted: {
    color: "#166534",
  },
  progressTrack: {
    marginTop: 10,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EEF2F7",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  goalBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalRemainingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  goalManageHint: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  goalManageHintCompleted: {
    color: "#166534",
  },
  archiveSwipeAction: {
    minWidth: 92,
    height: "100%",
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
  },
  archiveSwipeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyGoalsState: {
    marginTop: 8,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyGoalsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  emptyGoalsSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    textAlign: "center",
  },
  primaryCta: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.5)",
    justifyContent: "flex-end",
  },
  modalKeyboardWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modalTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  completedList: {
    maxHeight: 320,
  },
  emptyCompletedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: 18,
  },
  completedItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  completedItemTextWrap: {
    flex: 1,
  },
  completedItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  completedItemSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  completedArchivedAt: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  completedBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedBadgeActive: {
    backgroundColor: "rgba(22,163,74,0.12)",
    borderColor: "rgba(22,163,74,0.35)",
  },
  completedBadgeArchived: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  completedBadgeTextActive: {
    color: "#166534",
  },
  completedBadgeTextArchived: {
    color: "#4B5563",
  },
  inputLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalPrimaryButton: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  moneyInputWrap: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  moneyPrefix: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginRight: 2,
  },
  moneyInput: {
    minWidth: 130,
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    color: "#111827",
  },
  actionRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8,
  },
  deleteGoalButton: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  deleteGoalText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  withdrawButton: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  depositButton: {
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#111827",
  },
  withdrawText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "700",
  },
  depositText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

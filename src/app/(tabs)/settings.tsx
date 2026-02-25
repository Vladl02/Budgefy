import React, { useRef, useState } from 'react';
import { Text, View, StyleSheet,ScrollView, Pressable, Image, TextInput, Alert, Keyboard } from 'react-native';
import { Diamond,
         Pencil,
         User,
         ChartColumnStacked,
         CreditCard,
         PiggyBank,
         Repeat,
         Calendar,
         DollarSign,
         Languages,
         ChevronRight


        } from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';
import { SlidingSheet } from '@/src/components/SlidingSheet';
import { FlatList } from 'react-native-gesture-handler';
import { useGuardedModalPush } from '@/src/hooks/guardForModals';


export default function Settings() {

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  //sheet options
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>(null);
  const closeSheet = () => setSheetVisible(false);
  const [name, setName] = useState("John Doe");
  const [editingName, setEditingName] = useState(false);
  const prevNameRef = useRef(name);
  const { pushModal } = useGuardedModalPush();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'hi', name: 'Hindi' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
    { code: 'ko', name: 'Korean' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tr', name: 'Turkish' },
    { code: 'pl', name: 'Polish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'id', name: 'Indonesian' },
    // Add more languages as needed
];


  const openSheet = (option: string) => {
    setActiveOption(option);
    setSheetVisible(true);
  };

  // Function to pick an avatar image
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo access to choose an avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };


  const beginEditName = () => {
    prevNameRef.current = name;
    setEditingName(true);
  };

  const finishEditName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      // revert + keep user in edit mode
      setName(prevNameRef.current);
      Alert.alert("Name required", "Please enter a name.");
      return;
    }
    setName(trimmed);
    setEditingName(false);
    Keyboard.dismiss();
  };

  // Helper to render the sheet content based on activeOption
  const renderSheetContent = (close: () => void) => {
    switch (activeOption) {
      case "Category Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Category Manager</Text>
            <Text style={{ marginTop: 8, alignSelf: "center"}}>Arrange your categories here.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Budget Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600",alignSelf: "center" }}>Budget Manager</Text>
            <Text style={{ marginTop: 8,alignSelf: "center" }}>Configure your budgets here.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Saving Manager":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600",alignSelf: "center" }}>Saving Manager</Text>
            <Text style={{ marginTop: 8,alignSelf: "center" }}>Manage your savings goals.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Recurring Payments":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Recurring Payments</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>View and edit recurring payments.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Start Date":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Start Date</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Select your financial period start date.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Base Currency":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Base Currency</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Choose your default currency.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );

      case "Language":
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", alignSelf: "center" }}>Language</Text>
            <Text style={{ marginTop: 8, alignSelf: "center" }}>Select your app language.</Text>
            <FlatList
                    data={languages}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }) => <Text>{item.code}{item.name}</Text>}
                  />
          </View>
        );

      default:
        return (
          <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "600" }}>{activeOption}</Text>
            <Text style={{ marginTop: 8 }}>No content defined yet.</Text>
            <Pressable onPress={close} style={{ marginTop: 20, alignSelf: "flex-end" }}>
              <Text>Close</Text>
            </Pressable>
          </View>
        );
    }
  };

  return (
    <ScrollView>
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
    <View style={{marginTop: 50}}/>
    {/* User Card */}
    <View style={styles.userCard}>
      <View style={styles.profileSection}>
        {/* change the image when pressing the avatar */}
        <Pressable style={styles.userProfile} onPress={pickAvatar} hitSlop={10}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <User size={42} color="#000" strokeWidth={2.5} />
          )}
        </Pressable>

        {/* User Name with Edit Icon */}
        <View style={styles.nameRow}>
          {editingName ? (
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={finishEditName}
              onSubmitEditing={finishEditName}
              autoFocus
              style={styles.nameInput}
              placeholder="Your name"
              placeholderTextColor="#aaa"
            />
          ) : (
            <>
              <Text style={styles.userName}>{name}</Text>
              <Pressable
                style={styles.editName}
                onPress={beginEditName}
                hitSlop={10}
              >
                <Pencil size={14} color="#ffffffff" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
        </View>
      </View>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statsText}>13</Text>
            <Text style={styles.statsDescription}>Current Streak</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statsText}>24</Text>
            <Text style={styles.statsDescription}>Total Days</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statsText}>67</Text>
            <Text style={styles.statsDescription}>Receipts Scanned</Text>
          </View>
        </View>
    </View>
    {/* Upgrade to Pro Section */}
    <View style={styles.upgradeSection}>
      <View style={styles.upgradeCard}>
        <Diamond size={20} color="#ffffffff" strokeWidth={2.5} />
          <Text style={styles.upgrade}>Upgrade To Pro</Text>
      </View>
    </View>
    {/* Options Section */}
    <View style={styles.optionsSection}>
        {/* Category Manager */}
        <Pressable style={styles.optionCard} onPress={() => openSheet("Category Manager")}>
          <ChartColumnStacked style={styles.optionIcon} color="#57A7FD" strokeWidth={3}/>
          <Text style={styles.optionText}>Category Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Budget Manager */}
        <Pressable style={styles.optionCard} onPress={() => openSheet("Budget Manager")}>
          <CreditCard style={styles.optionIcon} color="#FE5A59" strokeWidth={3}/>
          <Text style={styles.optionText}>Budget Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Saving Manager */}
        <Pressable style={styles.optionCard} onPress={() => pushModal({
            pathname: "/(modals)/(settings)/savingsmanager",
          })}>
          <PiggyBank style = {styles.optionIcon} color="#FFC83C" strokeWidth={3}/>
          <Text style={styles.optionText}>Saving Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Recurring Payments */}
        <Pressable style={styles.optionCard} onPress={() => pushModal({
            pathname: "/(modals)/(settings)/recurringexpense",
          })}>
          <Repeat style = {styles.optionIcon} color="#00DDB7" strokeWidth={3}/>
          <Text style={styles.optionText}>Recurring Payments</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Start Date */}
        <Pressable style={styles.optionCard} onPress={() => pushModal({
            pathname: "/(modals)/(settings)/startdate",
          })}>
          <Calendar style = {styles.optionIcon} color="#C48FEE" strokeWidth={3}/>
          <Text style={styles.optionText}>Start Date</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Base Currency */}
        <Pressable style={styles.optionCard} onPress={() => pushModal({
            pathname: "/(modals)/(settings)/currency",
          })}>
          <DollarSign style = {styles.optionIcon} color="#FF8544" strokeWidth={3}/>
          <Text style={styles.optionText}>Base Currency</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>
          {/* Language */}
        <Pressable style={styles.optionCard} onPress={() => pushModal({
            pathname: "/(modals)/(settings)/language",
          })}>
          <Languages style = {styles.optionIcon} color="#7E57FF" strokeWidth={3}/>
          <Text style={styles.optionText}>Language</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </Pressable>

    </View>
        <View style={{marginBottom: 50}}></View>
        {sheetVisible && (
          <SlidingSheet onDismiss={closeSheet} heightPercent={0.9}>
            {(close) => renderSheetContent(close)}
          </SlidingSheet>
        )}

    </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  userCard:{
    height: 300,
    width: '95%',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 20,
  },
  userProfile: {
    height: 70,
    width: 70,
    backgroundColor: "#ffffffff",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  profileSection: {
    alignItems: "center",
    marginTop: 40,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  userName: {
    color: "#ffffffff",
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  editName: {
    marginLeft: 8,
  },
  stats: {
  flexDirection: "row",
  width: "100%",
  marginTop: 70,
  paddingHorizontal: 16,
},

statsDescription: {
  width: "100%",
  textAlign: "center",
  color: "#fff",
  fontSize: 12,
  fontFamily: "Inter_400Regular",
},
  statsText:{
    color: '#ffffffff',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  statItem: {
  flex: 1,                
  alignItems: "center",   
},
nameInput: {
  color: "#fff",
  fontSize: 18,
  fontFamily: "Inter_600SemiBold",
  borderBottomWidth: 1,
  borderBottomColor: "#ffffff55",
  paddingVertical: 2,
  minWidth: 120,
  textAlign: "center",
},
  upgradeSection:{
    marginTop: 10,
    width: '95%',
    alignSelf: 'center',
  },
  upgradeCard:{
    height: 50,
    backgroundColor: '#0E1621',
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  upgrade:{
    color: '#ffffffff',
    fontSize: 16,
    marginLeft: 15,
    fontFamily: 'Inter_500Medium',
  },
  optionsSection:{
    width: '95%',
    alignSelf: 'center',
    marginBottom: 30,
    backgroundColor: 'white',
    borderRadius: 10,
  },
optionCard:{
  height: 50,
  backgroundColor: '#ffffffff',
  borderRadius: 10,
  marginBottom: 10,
  paddingHorizontal: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-start', 
},
  optionText:{
    color: '#000000ff',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  optionIcon: {
  marginRight: 12,
},
  optionChevron: {
    marginLeft: "auto",
    opacity: 1,
  },
  
});

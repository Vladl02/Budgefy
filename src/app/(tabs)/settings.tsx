import React, { useRef, useState } from 'react';
import { SafeArea } from '@/src/components/SafeArea';
import { Text, View, StyleSheet,ScrollView, Pressable, Image, TextInput, Alert, Keyboard } from 'react-native';
import { useFonts } from "expo-font";
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


export default function Settings() {


  const [avatarUri, setAvatarUri] = useState<string | null>(null);
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

  const [name, setName] = useState("John Doe");
  const [editingName, setEditingName] = useState(false);

  const prevNameRef = useRef(name);

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

  return (
  <SafeArea>
    <ScrollView>
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
    <Text style={{alignSelf: 'center'}}>Settings Screen</Text>
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
    
    <View style={styles.optionsSection}>
        <View style={styles.optionCard}>
          <ChartColumnStacked style = {styles.optionIcon} color="#57A7FD" strokeWidth={3}/>
          <Text style={styles.optionText}>Category Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <CreditCard style = {styles.optionIcon} color="#FE5A59" strokeWidth={3}/>
          <Text style={styles.optionText}>Budget Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <PiggyBank style = {styles.optionIcon} color="#FFC83C" strokeWidth={3}/>
          <Text style={styles.optionText}>Saving Manager</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <Repeat style = {styles.optionIcon} color="#00DDB7" strokeWidth={3}/>
          <Text style={styles.optionText}>Recurring Payments</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <Calendar style = {styles.optionIcon} color="#C48FEE" strokeWidth={3}/>
          <Text style={styles.optionText}>Start Date</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <DollarSign style = {styles.optionIcon} color="#FF8544" strokeWidth={3}/>
          <Text style={styles.optionText}>Base Currency</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
        <View style={styles.optionCard}>
          <Languages style = {styles.optionIcon} color="#7E57FF" strokeWidth={3}/>
          <Text style={styles.optionText}>Language</Text>
          <ChevronRight size={18} style={styles.optionChevron} />
        </View>
    </View>
        <View style={{marginBottom: 50}}></View>

    </Pressable>
    </ScrollView>
  </SafeArea>
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

import { Image, Input, Text, VStack, Icon, Pressable, ScrollView } from 'native-base'
import React, { useState, useEffect } from 'react'
import { useToast } from 'react-native-toast-notifications'
import { useNavigation } from '@react-navigation/native'
import ReactNativeBiometrics from 'react-native-biometrics'
import SInfo from "react-native-sensitive-info";
import { createWeb3Wallet } from '../../utils/Web3WalletClient'
import { Dimensions, StyleSheet } from 'react-native'
import { FONT_SIZE } from '../../utils/styles'
import { COLORS } from '../../utils/constants'
import MaterialIcons from "react-native-vector-icons/dist/MaterialIcons"
import Button from '../../components/Button'
import { useDispatch, useSelector } from 'react-redux'
import { loginUser, logoutUser } from '../../store/reducers/Auth'
import ConsentModal from '../../components/modals/ConsentModal'
import { clearSessions } from '../../store/reducers/ActiveSessions'
import { clearConnectedSites } from '../../store/reducers/ConnectedSites'
import { clearRecipients } from '../../store/reducers/Recipients'

type Props = {}

export default function Login({ }: Props) {
    const toast = useToast()
    const navigation = useNavigation()
    const dispatch = useDispatch()

    const auth = useSelector(state => state.auth)

    const [password, setPassword] = useState("")
    const [isInitializing, setIsInitializing] = useState(false)
    const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false)
    const [showResetWalletConsentModal, setShowResetWalletConsentModal] = useState(false)

    const initWallet = async () => {
        try {
            setIsInitializing(true)
            await createWeb3Wallet()

            if (!auth.isLoggedIn) {
                dispatch(loginUser())
            }

            if (password) {
                setPassword("")
            }

            navigation.navigate("Home")
        } catch (error) {
            toast.show("Failed to initialize wallet", {
                type: "danger"
            })
        } finally {
            setIsInitializing(false)
        }
    }

    const unlockWithPassword = async () => {
        if (!password) {
            toast.show("Password cannot be empty!", {
                type: "danger"
            })
            return
        }

        const _security = await SInfo.getItem("security", {
            sharedPreferencesName: "pocket.android.storage",
            keychainService: "pocket.ios.storage",
        });
        const security = JSON.parse(_security!)

        if (password !== security.password) {
            toast.show("Incorrect password!", {
                type: "danger"
            })
            return
        }

        await initWallet()

    }

    const unlockWithBiometrics = async () => {
        const rnBiometrics = new ReactNativeBiometrics()

        try {
            const signInWithBio = async () => {
                let epochTimeSeconds = Math.round((new Date()).getTime() / 1000).toString()
                let payload = epochTimeSeconds + 'some message'

                try {
                    const response = await rnBiometrics.createSignature({
                        promptMessage: 'Sign in',
                        payload: payload
                    })

                    if (response.success) {
                        await initWallet()
                    }
                } catch (error) {
                    return
                }

            }

            const { available } = await rnBiometrics.isSensorAvailable()

            if (available) {
                const { keysExist } = await rnBiometrics.biometricKeysExist()

                if (!keysExist) {
                    await rnBiometrics.createKeys()
                }

                signInWithBio()
            }
        } catch (error) {
            toast.show("Could not sign in with biometrics", {
                type: "danger"
            })
        }
    }

    const resetWallet = async () => {
        // remove mnemonic
        await SInfo.deleteItem("mnemonic", {
            sharedPreferencesName: "pocket.android.storage",
            keychainService: "pocket.ios.storage",
        });
        // remove accounts
        await SInfo.deleteItem("accounts", {
            sharedPreferencesName: "pocket.android.storage",
            keychainService: "pocket.ios.storage",
        })
        // remove password
        await SInfo.deleteItem("security", {
            sharedPreferencesName: "pocket.android.storage",
            keychainService: "pocket.ios.storage",
        });
        // clear active sessions
        dispatch(clearSessions())
        // clear connected sites
        dispatch(clearConnectedSites())
        // clear recipients
        dispatch(clearRecipients())
        // logout user
        dispatch(logoutUser())

        setTimeout(() => {
            navigation.navigate("Onboarding")
        }, 100)

    }

    useEffect(() => {
        (async () => {
            const _security = await SInfo.getItem("security", {
                sharedPreferencesName: "pocket.android.storage",
                keychainService: "pocket.ios.storage",
            });
            const security = JSON.parse(_security!)

            setIsBiometricsEnabled(security.isBiometricsEnabled)
            if (security.isBiometricsEnabled) {
                unlockWithBiometrics()
            }
        })()
    }, [])
    return (
        <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} style={styles.container}>
            <Image source={require("../../assets/images/pocket.jpg")} alt='Paux' style={{ width: Dimensions.get("window").height * 0.2, height: Dimensions.get("window").height * 0.2 }} />
            <Text fontSize={2 * FONT_SIZE['xl']} color={COLORS.primary} bold>Welcome Back!</Text>

            <VStack mt="5" space={2} w="full">
                <Text fontSize={FONT_SIZE['xl']} bold>Password</Text>
                <Input
                    value={password}
                    borderRadius="lg"
                    variant="filled"
                    fontSize="md"
                    focusOutlineColor={COLORS.primary}
                    InputLeftElement={
                        <Icon as={<MaterialIcons name="lock" />} size={5} ml="4" color="muted.400" />
                    }
                    secureTextEntry
                    placeholder='Password'
                    onChangeText={setPassword}
                    onSubmitEditing={unlockWithPassword}
                />
            </VStack>

            <Button text={isBiometricsEnabled && !password ? "SIGN IN WITH BIOMETRICS" : "SIGN IN"} onPress={isBiometricsEnabled && !password ? unlockWithBiometrics : unlockWithPassword} loading={isInitializing} style={{ marginTop: 20 }} />

            <Text fontSize={FONT_SIZE['lg']} textAlign="center" my="4">Wallet won't unlock? You can ERASE your current wallet and setup a new one</Text>

            <Pressable onPress={() => setShowResetWalletConsentModal(true)} _pressed={{ opacity: 0.4 }}><Text fontSize={FONT_SIZE['xl']} color={COLORS.primary}>Reset Wallet</Text></Pressable>

            <ConsentModal
                isVisible={showResetWalletConsentModal}
                title="Reset Wallet!"
                subTitle="This will erase all your current wallet data. Are you sure you want to go through with this?"
                onClose={() => setShowResetWalletConsentModal(false)}
                onAccept={() => {
                    setShowResetWalletConsentModal(false)
                    resetWallet()
                }}
            />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 15,
        backgroundColor: 'white'
    }
})
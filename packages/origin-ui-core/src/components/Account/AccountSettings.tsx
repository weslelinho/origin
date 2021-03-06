import React, { useState, useContext } from 'react';
import {
    Paper,
    Grid,
    makeStyles,
    createStyles,
    useTheme,
    Button,
    Switch,
    FormControlLabel,
    FormGroup,
    FormControl,
    InputLabel,
    Select,
    TextField,
    MenuItem,
    FilledInput
} from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { withStyles } from '@material-ui/core/styles';

import { signTypedMessage } from '@energyweb/utils-general';
import { MarketUser } from '@energyweb/market';
import { AVAILABLE_ORIGIN_LANGUAGES, ORIGIN_LANGUAGE } from '@energyweb/localization';

import { showNotification, NotificationType } from '../../utils/notifications';
import {
    getCurrencies,
    getOffChainDataSource,
    getEnvironment
} from '../../features/general/selectors';
import { getCurrentUser, getUserOffchain, getCurrentUserId } from '../../features/users/selectors';
import { OriginConfigurationContext, setOriginLanguage } from '../OriginConfigurationContext';
import { getWeb3 } from '../../features/selectors';
import { refreshUserOffchain } from '../../features/users/actions';
import { getActiveAccount, isUsingInBrowserPK } from '../../features/authentication/selectors';
import { useTranslation } from 'react-i18next';

export function AccountSettings() {
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const useStyles = makeStyles(() =>
        createStyles({
            container: {
                padding: '10px'
            },
            button: {
                marginTop: '10px'
            }
        })
    );

    const classes = useStyles(useTheme());

    const currentUser = useSelector(getCurrentUser);
    const userOffchain = useSelector(getUserOffchain);
    const currencies = useSelector(getCurrencies);
    const userClient = useSelector(getOffChainDataSource)?.userClient;
    const web3 = useSelector(getWeb3);
    const currentUserId = useSelector(getCurrentUserId);
    const usingPK = useSelector(isUsingInBrowserPK);
    const activeAccount = useSelector(getActiveAccount);
    const environment = useSelector(getEnvironment);

    const [notificationsEnabled, setNotificationsEnabled] = useState(null);

    const userNotificationsEnabled = currentUser?.offChainProperties.notifications ?? false;
    const autoPublish = currentUser?.offChainProperties?.autoPublish ?? null;

    const [autoPublishCandidate, setAutoPublish] = useState(autoPublish);

    if (currentUser) {
        if (notificationsEnabled === null) {
            setNotificationsEnabled(userNotificationsEnabled);
        }

        if (autoPublishCandidate === null) {
            setAutoPublish(autoPublish);
        }
    }

    const originConfiguration = useContext(OriginConfigurationContext);

    const PurpleSwitch = withStyles({
        switchBase: {
            color: originConfiguration.styleConfig.PRIMARY_COLOR,
            '&$checked': {
                color: originConfiguration.styleConfig.PRIMARY_COLOR
            },
            '&$checked + $track': {
                backgroundColor: originConfiguration.styleConfig.PRIMARY_COLOR
            }
        },
        checked: {},
        track: {}
    })(Switch);

    const notificationChanged = currentUser && notificationsEnabled !== userNotificationsEnabled;
    const autoPublishChanged = currentUser && autoPublishCandidate !== autoPublish;

    const propertiesChanged = notificationChanged || autoPublishChanged;

    async function saveChanges() {
        if (!propertiesChanged) {
            showNotification(t('general.feedback.noChangesMade'), NotificationType.Error);

            return;
        }

        if (notificationChanged || autoPublishChanged) {
            const newProperties: MarketUser.IMarketUserOffChainProperties =
                currentUser.offChainProperties;

            newProperties.notifications = notificationsEnabled;
            newProperties.autoPublish = autoPublishChanged
                ? autoPublishCandidate
                : newProperties.autoPublish;

            await currentUser.update(newProperties);
        }

        showNotification(t('settings.feedback.userSettingsUpdated'), NotificationType.Success);
    }

    async function signAndSend(): Promise<void> {
        try {
            const signedMessage = await signTypedMessage(
                currentUserId,
                environment.REGISTRATION_MESSAGE_TO_SIGN,
                web3,
                usingPK ? activeAccount?.privateKey : null
            );

            await userClient.attachSignedMessage(userOffchain.id, signedMessage);

            dispatch(refreshUserOffchain());

            showNotification(
                t('settings.feedback.blockchainAccountLinked'),
                NotificationType.Success
            );
        } catch (error) {
            if (error?.response?.data?.message) {
                showNotification(error?.response?.data?.message, NotificationType.Error);
            } else {
                console.warn('Could not log in.', error);
                showNotification(t('general.feedback.unknownError'), NotificationType.Error);
            }
        }
    }

    return (
        <Paper>
            <Grid container spacing={3} className={classes.container}>
                <Grid item xs={12}>
                    {userOffchain && (
                        <>
                            {`${userOffchain.title} ${userOffchain.firstName} ${userOffchain.lastName}`}

                            {userOffchain.organization && (
                                <>
                                    <br />
                                    <br />
                                    Organization: {userOffchain.organization.name}
                                </>
                            )}

                            <TextField
                                label={t('settings.properties.email')}
                                value={userOffchain.email}
                                fullWidth
                                className="my-3"
                                disabled
                            />

                            <TextField
                                label={t('settings.properties.blockchainAccount')}
                                value={userOffchain.blockchainAccountAddress}
                                fullWidth
                                className="my-3"
                                disabled
                            />

                            {!userOffchain.blockchainAccountAddress && (
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    className="mt-3 right"
                                    onClick={signAndSend}
                                >
                                    {t('settings.actions.verifyBlockchainAccount')}
                                </Button>
                            )}
                        </>
                    )}
                    {currentUser && (
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <PurpleSwitch
                                        checked={notificationsEnabled}
                                        onChange={(e, checked) => setNotificationsEnabled(checked)}
                                    />
                                }
                                label={t('settings.properties.notifications')}
                            />
                        </FormGroup>
                    )}
                    {currentUser && autoPublishCandidate !== null && (
                        <>
                            <div>
                                <hr />
                                <FormGroup>
                                    <FormControlLabel
                                        control={
                                            <PurpleSwitch
                                                checked={autoPublishCandidate.enabled}
                                                onChange={(e, checked) =>
                                                    setAutoPublish({
                                                        ...autoPublishCandidate,
                                                        enabled: checked
                                                    })
                                                }
                                            />
                                        }
                                        label={t(
                                            'settings.properties.automaticallyPostCertificates'
                                        )}
                                    />
                                </FormGroup>

                                {autoPublishCandidate.enabled && (
                                    <div>
                                        <TextField
                                            label={t('settings.properties.price')}
                                            value={autoPublishCandidate.priceInCents / 100}
                                            type="number"
                                            placeholder="1"
                                            onChange={e =>
                                                setAutoPublish({
                                                    ...autoPublishCandidate,
                                                    priceInCents: parseFloat(e.target.value) * 100
                                                })
                                            }
                                            id="priceInput"
                                            fullWidth
                                        />

                                        <FormControl fullWidth={true} variant="filled">
                                            <InputLabel>
                                                {t('settings.properties.currency')}
                                            </InputLabel>
                                            <Select
                                                value={autoPublishCandidate.currency}
                                                onChange={e =>
                                                    setAutoPublish({
                                                        ...autoPublishCandidate,
                                                        currency: e.target.value as string
                                                    })
                                                }
                                                fullWidth
                                                variant="filled"
                                                input={<FilledInput />}
                                            >
                                                {currencies.map(currency => (
                                                    <MenuItem key={currency} value={currency}>
                                                        {currency}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <Button onClick={saveChanges} color="primary" disabled={!propertiesChanged}>
                        {t('general.actions.update')}
                    </Button>

                    <FormControl fullWidth>
                        <InputLabel>{t('settings.properties.language')}</InputLabel>
                        <Select
                            value={originConfiguration.language}
                            onChange={e => setOriginLanguage(e.target.value as ORIGIN_LANGUAGE)}
                        >
                            {AVAILABLE_ORIGIN_LANGUAGES.map(option => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </Paper>
    );
}

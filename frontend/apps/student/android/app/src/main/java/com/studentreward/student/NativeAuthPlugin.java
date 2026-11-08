package com.studentreward.student;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.text.TextUtils;
import android.util.Base64;

import androidx.core.content.ContextCompat;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.CredentialManager;
import androidx.credentials.exceptions.CreateCredentialCancellationException;
import androidx.credentials.exceptions.CreateCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "NativeAuth")
public class NativeAuthPlugin extends Plugin {
    private static final String PREFERENCES = "native_auth";
    private static final String SESSION_KEY = "session_ciphertext";
    private static final String KEY_ALIAS = "student_session_key";
    private static final int GCM_TAG_LENGTH = 128;

    @PluginMethod
    public void getSession(PluginCall call) {
        try {
            String sessionId = readSession();
            JSObject result = new JSObject();
            if (sessionId != null) {
                result.put("sessionId", sessionId);
            }
            call.resolve(result);
        } catch (Exception exception) {
            call.reject("Could not read the protected session credential", exception);
        }
    }

    @PluginMethod
    public void saveSession(PluginCall call) {
        String sessionId = call.getString("sessionId");
        if (TextUtils.isEmpty(sessionId)) {
            call.reject("A non-empty session credential is required");
            return;
        }

        try {
            writeSession(sessionId);
            call.resolve();
        } catch (Exception exception) {
            call.reject("Could not protect the session credential", exception);
        }
    }

    @PluginMethod
    public void clearSession(PluginCall call) {
        boolean cleared = getContext()
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .remove(SESSION_KEY)
            .commit();
        if (!cleared) {
            call.reject("Could not clear the protected session credential");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void savePassword(PluginCall call) {
        String username = call.getString("username");
        String password = call.getString("password");
        if (TextUtils.isEmpty(username) || TextUtils.isEmpty(password)) {
            call.reject("Both username and password are required");
            return;
        }

        try {
            CredentialManager credentialManager = CredentialManager.create(getContext());
            CreatePasswordRequest request = new CreatePasswordRequest(username, password);
            Executor executor = ContextCompat.getMainExecutor(getContext());
            credentialManager.createCredentialAsync(
                getActivity(),
                request,
                null,
                executor,
                new androidx.credentials.CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                    @Override
                    public void onResult(CreateCredentialResponse result) {
                        JSObject response = new JSObject();
                        response.put("saved", true);
                        call.resolve(response);
                    }

                    @Override
                    public void onError(CreateCredentialException exception) {
                        if (exception instanceof CreateCredentialCancellationException) {
                            JSObject response = new JSObject();
                            response.put("saved", false);
                            call.resolve(response);
                            return;
                        }
                        call.reject("Android password manager could not save the credential", exception);
                    }
                }
            );
        } catch (Exception exception) {
            call.reject("Could not start the Android password-manager save flow", exception);
        }
    }

    private String readSession() throws Exception {
        String stored = getContext()
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getString(SESSION_KEY, null);
        if (stored == null) {
            return null;
        }

        String[] parts = stored.split("\\.", 2);
        if (parts.length != 2) {
            throw new IOException("Stored session credential has an invalid format");
        }

        byte[] iv = Base64.decode(parts[0], Base64.NO_WRAP);
        byte[] ciphertext = Base64.decode(parts[1], Base64.NO_WRAP);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_LENGTH, iv));
        byte[] plaintext = cipher.doFinal(ciphertext);
        return new String(plaintext, StandardCharsets.UTF_8);
    }

    private void writeSession(String sessionId) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] ciphertext = cipher.doFinal(sessionId.getBytes(StandardCharsets.UTF_8));
        String stored = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + "."
            + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
        boolean saved = getContext()
            .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit()
            .putString(SESSION_KEY, stored)
            .commit();
        if (!saved) {
            throw new IOException("Android could not persist the protected session credential");
        }
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
        }

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(
            new KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build()
        );
        return generator.generateKey();
    }
}

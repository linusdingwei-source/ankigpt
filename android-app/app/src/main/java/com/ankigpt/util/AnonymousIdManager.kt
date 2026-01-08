package com.ankigpt.util

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID

/**
 * 匿名 ID 管理器
 * 使用 DataStore 存储匿名用户 ID
 */
class AnonymousIdManager(private val context: Context) {
    
    companion object {
        private const val DATASTORE_NAME = "anonymous_prefs"
        private val ANONYMOUS_ID_KEY = stringPreferencesKey("anonymous_id")
        
        private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = DATASTORE_NAME)
    }
    
    /**
     * 获取或创建匿名 ID
     */
    suspend fun getOrCreateAnonymousId(): String {
        val existingId = getAnonymousIdSync()
        if (existingId != null) {
            return existingId
        }
        
        // 创建新的匿名 ID
        val newId = UUID.randomUUID().toString()
        saveAnonymousId(newId)
        return newId
    }
    
    /**
     * 获取匿名 ID
     */
    val anonymousId: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[ANONYMOUS_ID_KEY]
    }
    
    /**
     * 同步获取匿名 ID
     */
    suspend fun getAnonymousIdSync(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[ANONYMOUS_ID_KEY]
        }.first()
    }
    
    /**
     * 保存匿名 ID
     */
    private suspend fun saveAnonymousId(id: String) {
        context.dataStore.edit { preferences ->
            preferences[ANONYMOUS_ID_KEY] = id
        }
    }
    
    /**
     * 清除匿名 ID
     */
    suspend fun clearAnonymousId() {
        context.dataStore.edit { preferences ->
            preferences.remove(ANONYMOUS_ID_KEY)
        }
    }
}


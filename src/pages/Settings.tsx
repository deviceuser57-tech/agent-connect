import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Key, Globe, Palette, Moon, Sun, Bell, Database, Brain, Zap, RotateCcw } from 'lucide-react';
import { ApiKeyManager } from '@/components/settings/ApiKeyManager';
import { DNAManager } from '@/components/cognitive/DNAManager';
import { MemoryGraphPanel } from '@/components/cognitive/MemoryGraphPanel';
import { useToast } from '@/hooks/use-toast';

export const Settings: React.FC = () => {
  const { t, theme, toggleTheme, lang, setLang } = useApp();
  const { settings, setSetting, resetSettings } = useSettings();
  const { toast } = useToast();

  const handleReset = () => {
    resetSettings();
    toast({ title: 'Settings reset', description: 'All preferences restored to defaults.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.settings?.title || t.sidebar.settings}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t.settings?.systemSettings || 'Single source of truth for app-wide preferences'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </div>

      {/* Cognitive Architecture (top — most strategic) */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <DNAManager />
        <MemoryGraphPanel />
      </div>

      {/* Cognitive Engine controls — drives WorkflowBuilder defaults */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Cognitive Engine
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Controls the 12-layer reasoning pipeline used by Workflow Builder and downstream agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Cognitive Engine by default</Label>
              <p className="text-xs text-muted-foreground">
                When ON, Workflow Builder runs L0–L4 reasoning before generating a workflow.
              </p>
            </div>
            <Switch
              checked={settings.cognitiveEngineEnabled}
              onCheckedChange={(v) => setSetting('cognitiveEngineEnabled', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Hot-Path optimization
              </Label>
              <p className="text-xs text-muted-foreground">
                Skip heavy layers (L5.5/L9, single L4 cycle) for low-complexity inputs.
              </p>
            </div>
            <Switch
              checked={settings.hotPathEnabled}
              onCheckedChange={(v) => setSetting('hotPathEnabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Palette className="h-5 w-5 text-primary" />
              {t.settings?.appearance || 'Appearance'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t.settings?.customizeLook || 'Customize the look and feel'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.theme || 'Theme'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.switchTheme || 'Switch between light and dark mode'}</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2 shrink-0">
                {theme === 'dark' ? (<><Moon className="h-4 w-4" /><span className="hidden sm:inline">{t.settings?.dark || 'Dark'}</span></>)
                  : (<><Sun className="h-4 w-4" /><span className="hidden sm:inline">{t.settings?.light || 'Light'}</span></>)}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Globe className="h-5 w-5 text-primary" />
              {t.settings?.language || 'Language'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.chooseLanguage || 'Choose interface language'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.displayLanguage || 'Display Language'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.selectLanguage || 'Select your preferred language'}</p>
              </div>
              <Select value={lang} onValueChange={(value: 'en' | 'ar') => setLang(value)}>
                <SelectTrigger className="w-[120px] sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Key className="h-5 w-5 text-primary" />
              {t.settings?.apiKeys || 'API Keys'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t.settings?.apiKeysDescription || 'Manage external API keys for AI providers.'}
            </CardDescription>
          </CardHeader>
          <CardContent><ApiKeyManager /></CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Bell className="h-5 w-5 text-primary" />
              {t.settings?.notifications || 'Notifications'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.notificationPreferences || 'Manage notification preferences'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.emailNotifications || 'Email Notifications'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.receiveWorkflowUpdates || 'Receive workflow updates'}</p>
              </div>
              <Switch checked={settings.emailNotifications} onCheckedChange={(v) => setSetting('emailNotifications', v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.browserNotifications || 'Browser Notifications'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.showDesktopAlerts || 'Show desktop alerts'}</p>
              </div>
              <Switch checked={settings.browserNotifications} onCheckedChange={(v) => setSetting('browserNotifications', v)} />
            </div>
          </CardContent>
        </Card>

        {/* RAG Settings */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Database className="h-5 w-5 text-primary" />
              {t.settings?.ragSettings || 'RAG Settings'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.configureRetrieval || 'Configure retrieval parameters'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.citationDisplay || 'Citation Display'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.showSourcesInResponses || 'Show sources in responses'}</p>
              </div>
              <Switch checked={settings.citationDisplay} onCheckedChange={(v) => setSetting('citationDisplay', v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.hallucinationCheck || 'Hallucination Check'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.verifyAIResponses || 'Verify AI responses against sources'}</p>
              </div>
              <Switch checked={settings.hallucinationCheck} onCheckedChange={(v) => setSetting('hallucinationCheck', v)} />
            </div>
          </CardContent>
        </Card>

        {/* General */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <SettingsIcon className="h-5 w-5 text-primary" />
              {t.settings?.general || 'General'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t.settings?.generalSettings || 'General system settings'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.autoSave || 'Auto-save'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.saveChangesAutomatically || 'Save changes automatically'}</p>
              </div>
              <Switch checked={settings.autoSave} onCheckedChange={(v) => setSetting('autoSave', v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t.settings?.analyticsLabel || 'Analytics'}</Label>
                <p className="text-xs text-muted-foreground">{t.settings?.helpImprove || 'Help improve the platform'}</p>
              </div>
              <Switch checked={settings.analyticsEnabled} onCheckedChange={(v) => setSetting('analyticsEnabled', v)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

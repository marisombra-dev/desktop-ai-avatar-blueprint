#include "Modules/ModuleManager.h"
#include "Containers/Ticker.h"
#include "Features/IModularFeatures.h"
#include "ILiveLinkClient.h"
#include "MetaHumanLocalLiveLinkSource.h"
#include "MetaHumanAudioBaseLiveLinkSubject.h"
#include "MetaHumanAudioBaseLiveLinkSubjectSettings.h"
#include "Sockets.h"
#include "SocketSubsystem.h"
#include "HAL/PlatformProcess.h"

DEFINE_LOG_CATEGORY_STATIC(LogDesktopAvatarAudioBridge, Log, All);

namespace DesktopAvatarAudio
{
static constexpr int32 Port = 19781;
static const FName SubjectName(TEXT("DesktopAvatar_PCM"));

class FPcmSubject final : public FMetaHumanAudioBaseLiveLinkSubject
{
public:
    FPcmSubject(
        ILiveLinkClient* Client,
        const FGuid& SourceGuid,
        const FName& Name,
        UMetaHumanAudioBaseLiveLinkSubjectSettings* Settings)
        : FMetaHumanAudioBaseLiveLinkSubject(Client, SourceGuid, Name, Settings)
    {
    }

protected:
    virtual void MediaSamplerMain() override;
};

void FPcmSubject::MediaSamplerMain()
{
    ISocketSubsystem* SocketSystem = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
    if (!SocketSystem)
    {
        SetError(TEXT("Desktop Avatar PCM socket subsystem unavailable."));
        return;
    }

    FSocket* Socket = SocketSystem->CreateSocket(NAME_DGram, TEXT("DesktopAvatarPCM"), false);
    if (!Socket)
    {
        SetError(TEXT("Desktop Avatar PCM socket creation failed."));
        return;
    }

    Socket->SetNonBlocking(true);
    Socket->SetReuseAddr(true);
    int32 ActualReceiveBuffer = 0;
    Socket->SetReceiveBufferSize(1024 * 1024, ActualReceiveBuffer);

    TSharedRef<FInternetAddr> Address = SocketSystem->CreateInternetAddr();
    bool bValidAddress = false;
    Address->SetIp(TEXT("127.0.0.1"), bValidAddress);
    Address->SetPort(Port);

    if (!bValidAddress || !Socket->Bind(*Address))
    {
        SetError(FString::Printf(TEXT("Desktop Avatar PCM bind failed on 127.0.0.1:%d."), Port));
        SocketSystem->DestroySocket(Socket);
        return;
    }

    UE_LOG(
        LogDesktopAvatarAudioBridge,
        Display,
        TEXT("Listening for float32 mono PCM on 127.0.0.1:%d"),
        Port
    );

    while (IsRunning())
    {
        uint32 PendingSize = 0;
        if (!Socket->HasPendingData(PendingSize))
        {
            FPlatformProcess::Sleep(0.002f);
            continue;
        }

        const int32 PacketBytes = FMath::Min<int32>(static_cast<int32>(PendingSize), 16384);
        TArray<uint8> Packet;
        Packet.SetNumUninitialized(PacketBytes);

        int32 BytesRead = 0;
        if (!Socket->Recv(Packet.GetData(), Packet.Num(), BytesRead) || BytesRead < 4)
        {
            continue;
        }

        // Optional local rendering-control sideband. Unknown commands are ignored.
        static const ANSICHAR ControlPrefix[] = "DECTRL|";
        constexpr int32 PrefixLen = UE_ARRAY_COUNT(ControlPrefix) - 1;

        if (BytesRead > PrefixLen
            && FMemory::Memcmp(Packet.GetData(), ControlPrefix, PrefixLen) == 0)
        {
            Packet.SetNum(BytesRead + 1);
            Packet[BytesRead] = 0;
            const FString Control(ANSI_TO_TCHAR(reinterpret_cast<const ANSICHAR*>(Packet.GetData())));

            TArray<FString> Parts;
            Control.ParseIntoArray(Parts, TEXT("|"), true);

            if (Parts.Num() >= 4 && Parts[1].Equals(TEXT("MOOD"), ESearchCase::IgnoreCase))
            {
                EAudioDrivenAnimationMood Mood = EAudioDrivenAnimationMood::AutoDetect;
                if (Parts[2].Equals(TEXT("Neutral"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Neutral;
                else if (Parts[2].Equals(TEXT("Happiness"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Happiness;
                else if (Parts[2].Equals(TEXT("Sadness"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Sadness;
                else if (Parts[2].Equals(TEXT("Disgust"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Disgust;
                else if (Parts[2].Equals(TEXT("Anger"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Anger;
                else if (Parts[2].Equals(TEXT("Surprise"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Surprise;
                else if (Parts[2].Equals(TEXT("Fear"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Fear;
                else if (Parts[2].Equals(TEXT("Confidence"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Confidence;
                else if (Parts[2].Equals(TEXT("Excitement"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Excitement;
                else if (Parts[2].Equals(TEXT("Boredom"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Boredom;
                else if (Parts[2].Equals(TEXT("Playfulness"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Playfulness;
                else if (Parts[2].Equals(TEXT("Confusion"), ESearchCase::IgnoreCase)) Mood = EAudioDrivenAnimationMood::Confusion;

                const float Intensity = FMath::Clamp(FCString::Atof(*Parts[3]), 0.0f, 1.0f);
                SetMood(Mood, Intensity);
            }

            continue;
        }

        const int32 SampleCount = BytesRead / static_cast<int32>(sizeof(float));
        if (SampleCount <= 0) continue;

        FAudioSample Sample;
        Sample.NumChannels = 1;
        Sample.SampleRate = 16000;
        Sample.NumSamples = SampleCount;
        Sample.Data.SetNumUninitialized(SampleCount);

        const float* Incoming = reinterpret_cast<const float*>(Packet.GetData());
        for (int32 Index = 0; Index < SampleCount; ++Index)
        {
            const float Value = Incoming[Index];
            Sample.Data[Index] = FMath::IsFinite(Value)
                ? FMath::Clamp(Value, -1.0f, 1.0f)
                : 0.0f;
        }

        GetSampleTime(FFrameRate(30, 1), Sample.Time, Sample.TimeSource);
        Sample.NumDropped = 0;
        AddAudioSample(MoveTemp(Sample));
    }

    Socket->Close();
    SocketSystem->DestroySocket(Socket);
}

class FPcmSource final : public FMetaHumanLocalLiveLinkSource
{
public:
    virtual FText GetSourceType() const override
    {
        return FText::FromString(TEXT("Desktop Avatar PCM"));
    }

protected:
    virtual TSharedPtr<FMetaHumanLocalLiveLinkSubject> CreateSubject(
        const FName& Name,
        UMetaHumanLocalLiveLinkSubjectSettings* InSettings
    ) override
    {
        auto* AudioSettings = CastChecked<UMetaHumanAudioBaseLiveLinkSubjectSettings>(InSettings);
        return MakeShared<FPcmSubject>(LiveLinkClient, SourceGuid, Name, AudioSettings);
    }
};
} // namespace DesktopAvatarAudio

class FDesktopAvatarAudioBridgeModule final : public IModuleInterface
{
public:
    virtual void StartupModule() override
    {
        TickerHandle = FTSTicker::GetCoreTicker().AddTicker(
            FTickerDelegate::CreateRaw(this, &FDesktopAvatarAudioBridgeModule::TryStart),
            0.25f
        );
    }

    virtual void ShutdownModule() override
    {
        if (TickerHandle.IsValid())
        {
            FTSTicker::GetCoreTicker().RemoveTicker(TickerHandle);
        }

        if (SubjectSettings)
        {
            SubjectSettings->RemoveFromRoot();
            SubjectSettings = nullptr;
        }

        if (Source.IsValid())
        {
            Source->RequestSourceShutdown();
            Source.Reset();
        }
    }

private:
    bool TryStart(float)
    {
        if (Source.IsValid()) return false;

        IModularFeatures& Features = IModularFeatures::Get();
        if (!Features.IsModularFeatureAvailable(ILiveLinkClient::ModularFeatureName))
        {
            return true;
        }

        ILiveLinkClient& Client = Features.GetModularFeature<ILiveLinkClient>(
            ILiveLinkClient::ModularFeatureName
        );

        Source = MakeShared<DesktopAvatarAudio::FPcmSource>();
        const FGuid SourceGuid = Client.AddSource(Source);
        if (!SourceGuid.IsValid())
        {
            UE_LOG(LogDesktopAvatarAudioBridge, Warning, TEXT("Could not register PCM Live Link source."));
            Source.Reset();
            return true;
        }

        SubjectSettings = Source->CreateSubjectSettings<UMetaHumanAudioBaseLiveLinkSubjectSettings>();
        SubjectSettings->AddToRoot();

        const FLiveLinkSubjectKey SubjectKey = Source->RequestSubjectCreation(
            DesktopAvatarAudio::SubjectName.ToString(),
            SubjectSettings
        );

        if (!SubjectKey.Source.IsValid())
        {
            UE_LOG(LogDesktopAvatarAudioBridge, Warning, TEXT("Could not create PCM Live Link subject."));
            SubjectSettings->RemoveFromRoot();
            SubjectSettings = nullptr;
            Source->RequestSourceShutdown();
            Source.Reset();
            return true;
        }

        UE_LOG(
            LogDesktopAvatarAudioBridge,
            Display,
            TEXT("Desktop Avatar PCM Live Link ready as %s on UDP %d"),
            *DesktopAvatarAudio::SubjectName.ToString(),
            DesktopAvatarAudio::Port
        );

        return false;
    }

    FTSTicker::FDelegateHandle TickerHandle;
    TSharedPtr<DesktopAvatarAudio::FPcmSource> Source;
    UMetaHumanAudioBaseLiveLinkSubjectSettings* SubjectSettings = nullptr;
};

IMPLEMENT_MODULE(FDesktopAvatarAudioBridgeModule, DesktopAvatarAudioBridge)

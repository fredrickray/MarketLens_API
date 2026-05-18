import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alert, type AlertDocument } from './schemas/alert.schema';

@Injectable()
export class AlertsRepository {
  constructor(
    @InjectModel(Alert.name) private readonly alertModel: Model<AlertDocument>,
  ) {}

  create(data: Partial<Alert>): Promise<AlertDocument> {
    return this.alertModel.create(data);
  }

  countByUser(userId: string): Promise<number> {
    return this.alertModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
  }

  findByUser(userId: string): Promise<AlertDocument[]> {
    return this.alertModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  findActive(): Promise<AlertDocument[]> {
    return this.alertModel.find({ isActive: true }).exec();
  }

  findByIdForUser(id: string, userId: string): Promise<AlertDocument | null> {
    return this.alertModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
  }

  updateById(
    id: string,
    userId: string,
    update: Partial<Alert>,
  ): Promise<AlertDocument | null> {
    return this.alertModel
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { $set: update },
        { new: true },
      )
      .exec();
  }

  deleteById(id: string, userId: string): Promise<AlertDocument | null> {
    return this.alertModel
      .findOneAndDelete({ _id: id, userId: new Types.ObjectId(userId) })
      .exec();
  }
}
